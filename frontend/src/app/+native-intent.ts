import Constants from "expo-constants";
import {credentialLink,rememberCredential} from "../session/links";

export function redirectSystemPath({path}:{path:string;initial:boolean}){
  const link=credentialLink(path,Constants.expoConfig?.extra?.linkHost);
  if(link){
    if(link.token)rememberCredential(link.route,link.token);
    return link.route;
  }
  return path;
}
