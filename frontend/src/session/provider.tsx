import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { apiBase, ApiError, HttpClient, type Scope } from "../api/client";
import { RealiApi, type Me, type Member, type Organization, type ProfileUpdate, type School } from "../api/reali";
import { SessionTokens } from "./tokens";

const refreshKey = "reali.refresh.v1";
const tokens = new SessionTokens({
  read: () => Platform.OS === "web" ? Promise.resolve(null) : SecureStore.getItemAsync(refreshKey),
  write: value => Platform.OS === "web" ? Promise.resolve() : value
    ? SecureStore.setItemAsync(refreshKey, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
    : SecureStore.deleteItemAsync(refreshKey),
});
function getApiBase() {
  const host = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  const fallback = __DEV__ ? `http://${host}:8000/api/v1` : undefined;
  return apiBase(process.env.EXPO_PUBLIC_API_URL || fallback, __DEV__);
}
const http = new HttpClient(getApiBase, tokens);
tokens.attach(http);
export const api = new RealiApi(http);

type Selection = {organization?: string; school?: string};
export type SessionStatus = "INITIALIZING" | "UNAUTHENTICATED" | "AUTHENTICATED" | "SESSION_EXPIRED" | "ACCOUNT_DISABLED";
export type Workspace = {
  key: string; scope: Scope; organization: Organization; member: Member;
  schools: School[]; school: School | null; cache: Map<string, unknown>;
};
type State = {status: SessionStatus; me: Me | null; organizations: Organization[]; workspace: Workspace | null; error: string | null; selecting: boolean};
const initial: State = {status:"INITIALIZING",me:null,organizations:[],workspace:null,error:null,selecting:false};
type Session = State & {
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(update: ProfileUpdate): Promise<void>;
  select(organization: string, school?: string): Promise<void>;
  revalidate(): Promise<void>;
  retry(): void;
  can(name:string): boolean;
};
const Context = createContext<Session | null>(null);

async function readPreference(user: number): Promise<Selection> {
  if (Platform.OS === "web") return {};
  try { return JSON.parse(await SecureStore.getItemAsync(`reali.scope.${user}`) ?? "{}") as Selection; }
  catch { return {}; }
}
function savePreference(user:number, selection:Selection) {
  if (Platform.OS !== "web") void SecureStore.setItemAsync(`reali.scope.${user}`,JSON.stringify(selection)).catch(() => undefined);
}

export function SessionProvider({children}:{children:ReactNode}) {
  const [state, setState] = useState(initial);
  const saved = useRef(state);
  const revision = useRef(0);
  const tenantAbort = useRef<AbortController | null>(null);
  const loading = useRef<AbortController | null>(null);
  const signing = useRef(false);
  const refreshContext = useRef<Promise<void> | null>(null);

  const commit = useCallback((next:State) => { saved.current = next; setState(next); }, []);
  const isolate = useCallback(() => {
    loading.current?.abort();
    tenantAbort.current?.abort();
    saved.current.workspace?.cache.clear();
    return ++revision.current;
  }, []);

  const hydrate = useCallback(async (selection?:Selection, preserve=false) => {
    if (refreshContext.current && preserve) return refreshContext.current;
    const original = saved.current;
    const run = preserve ? ++revision.current : isolate();
    loading.current?.abort();
    const controller = new AbortController();
    loading.current = controller;
    if (!preserve) commit({...original,workspace:null,selecting:true,error:null});
    const task = (async () => {
      try {
        const [me, allOrganizations] = await Promise.all([api.me(controller.signal), api.organizations(controller.signal)]);
        const organizations = allOrganizations.filter(org => org.is_active && me.memberships.some(member => member.is_active && member.organization === org.id));
        const pref = selection ?? (original.workspace ? {organization:original.workspace.organization.id,school:original.workspace.school?.id} : await readPreference(me.user.id));
        let organization = organizations.find(item=>item.id===pref.organization) ?? (organizations.length===1 ? organizations[0] : undefined);
        let member = me.memberships.find(item=>item.is_active && item.organization===organization?.id);
        let schools:School[] = [];
        if (organization && member) {
          try { schools = (await api.schools({organization:organization.id,signal:controller.signal})).filter(school => school.is_active); }
          catch (error) {
            if (!(error instanceof ApiError) || error.status !== 403) throw error;
            organization = undefined;
            member = undefined;
          }
        }
        if (run !== revision.current) return;
        const school = schools.find(item=>item.id===pref.school) ?? (schools.length===1 ? schools[0]:null);
        const previous = original.workspace;
        const same = preserve && previous && organization?.id === previous.organization.id && school?.id === previous.school?.id
          && JSON.stringify(member?.capabilities) === JSON.stringify(previous.member.capabilities)
          && JSON.stringify(schools.map(item=>item.id)) === JSON.stringify(previous.schools.map(item=>item.id));
        if (!same) {
          tenantAbort.current?.abort();
          previous?.cache.clear();
          tenantAbort.current = new AbortController();
        }
        const workspace = organization && member
          ? {...(same ? {key:previous.key,cache:previous.cache,scope:previous.scope} :
              {key:`${me.user.id}:${organization.id}:${school?.id??""}:${run}`,cache:new Map<string,unknown>(),scope:{organization:organization.id,signal:tenantAbort.current?.signal}}),
              organization,member,schools,school}
          : null;
        if (workspace) savePreference(me.user.id,{organization:workspace.organization.id,school:workspace.school?.id});
        const lostAccess = Boolean(pref.organization && !organization || pref.school && !schools.some(item=>item.id===pref.school));
        commit({status:"AUTHENTICATED",me,organizations,workspace,selecting:false,error:lostAccess?"Seu acesso institucional mudou. Confira as escolas disponíveis.":null});
      } catch (cause) {
        if (run !== revision.current) return;
        const message = cause instanceof Error ? cause.message : "Não foi possível verificar a sessão.";
        if (cause instanceof ApiError && [401,403].includes(cause.status)) {
          tokens.clear();
          isolate();
          commit({...initial,status:"SESSION_EXPIRED",error:message});
        } else {
          commit({...saved.current,selecting:false,error:message});
        }
      }
    })();
    if (preserve) refreshContext.current = task;
    try { await task; }
    finally { if (refreshContext.current === task) refreshContext.current = null; }
  }, [commit,isolate]);

  const initialize = useCallback(async () => {
    if (signing.current) return;
    signing.current = true;
    const run = isolate();
    commit(initial);
    try {
      const restored = await tokens.restore();
      if (run !== revision.current) return;
      if (restored) {
        await hydrate();
        if (saved.current.status === "INITIALIZING") commit({...saved.current, status:"UNAUTHENTICATED"});
      }
      else commit({...initial,status:"UNAUTHENTICATED"});
    } catch (error) {
      if (run === revision.current) commit({...initial,status:"UNAUTHENTICATED",error:error instanceof Error?error.message:"Não foi possível recuperar a sessão."});
    } finally { signing.current = false; }
  },[commit,hydrate,isolate]);

  useEffect(() => {
    tokens.onExpired = status => {
      isolate();
      commit({...initial,status,error:status==="ACCOUNT_DISABLED"?"Sua conta está desativada.":"Sua sessão expirou. Entre novamente."});
    };
    let mounted=true;
    void Promise.resolve().then(()=>{if(mounted)void initialize();});
    return () => { mounted=false;tokens.onExpired = undefined; };
  },[commit,initialize,isolate]);

  const revalidate = useCallback(async () => {
    if (saved.current.status==="AUTHENTICATED" && !saved.current.selecting && tokens.credentials().access) await hydrate(undefined,true);
  },[hydrate]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", value => { if (value === "active") void revalidate(); });
    return () => listener.remove();
  },[revalidate]);

  const signIn = async (email:string,password:string) => {
    if (signing.current) throw new ApiError(0,"BUSY","Aguarde a operação em andamento.");
    signing.current = true;
    try {
      const credentials = tokens.credentials();
      const session = await api.login(email,password);
      await tokens.accept(session,credentials.generation);
      await hydrate();
      if (saved.current.status !== "AUTHENTICATED") {
        if (saved.current.status !== "SESSION_EXPIRED") commit({...initial,error:saved.current.error});
        throw new ApiError(0,"SESSION_VALIDATION",saved.current.error ?? "Não foi possível validar o acesso.");
      }
    } finally { signing.current=false; }
  };

  const signOut = async () => {
    if (signing.current) return;
    signing.current=true;
    isolate();
    commit({...initial,status:"UNAUTHENTICATED"});
    try { await tokens.logout(); }
    catch (error) {
      const message = error instanceof ApiError && error.code === "SECURE_STORAGE"
        ? error.message : "A sessão local foi encerrada. A confirmação de saída no servidor ficou indisponível.";
      commit({...initial,status:"UNAUTHENTICATED",error:message});
    } finally { signing.current=false; }
  };

  const updateProfile = async (update: ProfileUpdate) => {
    const generation = tokens.credentials().generation;
    const user = await api.updateProfile(update);
    await refreshContext.current;
    const current = saved.current;
    if (tokens.credentials().generation === generation && current.me?.user.id === user.id) {
      commit({...current, me:{...current.me, user}});
    }
  };

  return <Context.Provider value={{...state, signIn, signOut, updateProfile, select:(organization,school)=>hydrate({organization,school}),
    revalidate, retry:()=>{ void initialize(); },can:name=>state.workspace?.member.capabilities?.includes(name) ?? false}}>
    {children}
  </Context.Provider>;
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider ausente");
  return value;
}
