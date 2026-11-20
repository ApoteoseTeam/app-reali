const assert=require("node:assert/strict");
const {test}=require("node:test");
const {apiBase,HttpClient}=require("../.test-build/api/client.js");
const {RealiApi,objectId}=require("../.test-build/api/reali.js");
const {SessionTokens}=require("../.test-build/session/tokens.js");
const {credentialLink}=require("../.test-build/session/links.js");

const base="https://reali.example/api/v1";
const org="5bbac35f-24e8-4933-aba1-8d9e8122db0b";
const school="cf16e967-7114-4847-945e-4270f10d2238";
const meal="31c8c8ce-60ee-4cca-9374-ab1a97592c51";
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const page=results=>({results,count:results.length,next:null,previous:null});
function mock(handler){
  let stored=null;
  const calls=[];
  const tokens=new SessionTokens({read:async()=>stored,write:async value=>{stored=value;}});
  const http=new HttpClient(()=>base,tokens,async (url,request)=>{
    const path=url.slice(base.length+1);
    const call={path,request,body:request.body&&JSON.parse(request.body)};
    calls.push(call);
    return handler(call,calls);
  });
  tokens.attach(http);
  return {api:new RealiApi(http),http,tokens,calls,stored:()=>stored};
}
const sync=fixture=>fixture.tokens.accept({access:"first-access",refresh:"stored-refresh"},fixture.tokens.credentials().generation);
const nextIteration=()=>new Promise(resolve=>setImmediate(resolve));

test("cliente usa o fetch padrão com o receptor aceito pelo navegador",async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=function(){
    if(this!==globalThis&&this!==undefined)throw new TypeError("Illegal invocation");
    return Promise.resolve(json({ok:true}));
  };
  try {
    const tokens=new SessionTokens({read:async()=>null,write:async()=>undefined});
    const http=new HttpClient(()=>base,tokens);
    assert.deepEqual(await http.request("health/",{auth:false}),{ok:true});
  } finally {
    globalThis.fetch=original;
  }
});

test("logout informa falha na remoção do SecureStore mesmo com resposta remota 401", async()=>{
  const tokens=new SessionTokens({
    read:async()=>null,
    write:async value=>{if(value===null)throw new Error("fixture storage failure");},
  });
  const http=new HttpClient(()=>base,tokens,async()=>json({detail:"Sessão encerrada"},401));
  tokens.attach(http);
  await tokens.accept({access:"first-access",refresh:"stored-refresh"},tokens.credentials().generation);
  await assert.rejects(tokens.logout(),{code:"SECURE_STORAGE"});
  assert.equal(tokens.credentials().access,null);
});

test("HTTPS nos builds publicados, escopo e bloqueio de paginação externa", async()=>{
  assert.equal(apiBase("http://10.0.2.2:8000/api/v1/",true),"http://10.0.2.2:8000/api/v1");
  for(const url of ["http://example.com/api/v1","https://user@reali.example/api/v1","https://reali.example/wrong","https://reali.example/api/v1?token=unexpected"]){
    assert.throws(()=>apiBase(url,false),{code:"CONFIGURATION"});
  }
  const fixture=mock(()=>json({reference_date:"2026-11-19",total_student_entries:0,total_served_plates:null,data_status:"PROVISIONAL"}));
  await sync(fixture);
  const response=await fixture.api.dashboard({organization:org},{school,date:"2026-11-19"});
  assert.equal(response.total_student_entries,0);
  assert.equal(response.total_served_plates,null);
  assert.equal(response.data_status,"PROVISIONAL");
  assert.equal(fixture.calls[0].request.headers.Authorization,"Bearer first-access");
  assert.equal(fixture.calls[0].request.headers["X-Organization-ID"],org);
  assert.match(fixture.calls[0].path,/analytics\/dashboard\/\?school=/);
  assert.throws(()=>fixture.http.next("https://other.example/api/v1/schools/?page=2"),{code:"INVALID_PAGE"});
  assert.equal(fixture.http.next(base+"/schools/?page=2"),"schools/?page=2");
  assert.throws(()=>objectId("../"),{code:"INVALID_ID"});
});

test("renova uma única vez para 401 simultâneos, persiste refresh rotativo e repete leituras", async()=>{
  const fixture=mock(async ({path,request,body})=>{
    if(path==="auth/refresh/"){
      assert.deepEqual(body,{refresh:"stored-refresh"});
      await nextIteration();
      return json({access:"new-access",refresh:"new-refresh"});
    }
    return request.headers.Authorization==="Bearer first-access"?json({code:"token_not_valid"},401):json({ok:true});
  });
  await sync(fixture);
  assert.deepEqual(await Promise.all([fixture.api.me(),fixture.api.me()]),[{ok:true},{ok:true}]);
  assert.equal(fixture.calls.filter(call=>call.path==="auth/refresh/").length,1);
  assert.equal(fixture.stored(),"new-refresh");
});

test("mutação sem idempotência requer nova confirmação após renovar",async()=>{
  const fixture=mock(({path})=>path==="auth/refresh/"?json({access:"new",refresh:"rotated"}):json({code:"token_not_valid"},401));
  await sync(fixture);
  await assert.rejects(fixture.api.start({organization:org},meal),{code:"RETRY_AFTER_REFRESH"});
  assert.equal(fixture.calls.filter(call=>call.path.includes("/start/")).length,1);
});

test("reenvio do RealInova conserva corpo e UUID estável",async()=>{
  const fixture=mock(({path,request})=>{
    if(path==="auth/refresh/")return json({access:"new",refresh:"rotated"});
    return request.headers.Authorization==="Bearer first-access"?json({code:"token_not_valid"},401):json({status:"PENDING"},202);
  });
  await sync(fixture);
  const body={conversation_id:meal,school_id:school,client_request_id:school,message:"O que significa erro absoluto?"};
  assert.equal((await fixture.api.chat({organization:org},body)).status,"PENDING");
  assert.deepEqual(fixture.calls.filter(item=>item.path==="ai/chat/").map(item=>item.body),[body,body]);
});

test("recuperação, revogação e limpeza da sessão",async()=>{
  const fixture=mock(({path,body})=>{
    if(path==="auth/logout/"){
      assert.deepEqual(body,{refresh:"rotated"});
      return new Response(null,{status:204});
    }
    if(path==="auth/refresh/")return json({access:"restored",refresh:"rotated"});
    throw Error("Rota inesperada");
  });
  await sync(fixture);
  assert.equal(await fixture.tokens.restore(),true);
  await fixture.tokens.logout();
  assert.equal(fixture.stored(),null);
  await assert.rejects(fixture.api.me(),{code:"NO_SESSION"});
});

test("refresh rejeitado limpa a sessão e distingue conta inativa",async()=>{
  const fixture=mock(({path})=>path==="auth/refresh/"?json({detail:"Conta inativa",code:"user_inactive"},401):json({code:"token_not_valid"},401));
  await sync(fixture);
  let status;
  fixture.tokens.onExpired=value=>{status=value;};
  await assert.rejects(fixture.api.me(),{code:"user_inactive"});
  await nextIteration();
  assert.equal(status,"ACCOUNT_DISABLED");
  assert.equal(fixture.stored(),null);
});

test("cancelamento de contexto ignora resposta mesmo se o transporte a entregar",async()=>{
  let release;
  const fixture=mock(()=>new Promise(resolve=>{release=resolve;}));
  const previous=new AbortController();
  await sync(fixture);
  const request=fixture.api.dashboard({organization:org,signal:previous.signal},{school});
  previous.abort();
  release(json({total_served_plates:145}));
  await assert.rejects(request,{code:"CANCELLED"});
});

test("timeout sem retry de mutação e mensagem de rede",async()=>{
  const fixture=mock(({request})=>new Promise((_,reject)=>request.signal.addEventListener("abort",()=>reject(Error("abort")))));
  await sync(fixture);
  await assert.rejects(fixture.http.request("auth/me/",{timeout:2}),{code:"TIMEOUT"});
  const offline=mock(()=>{throw Error("not connected");});
  await sync(offline);
  await assert.rejects(offline.api.me(),{code:"OFFLINE"});
});

test("erros preservam códigos e campos seguros",async()=>{
  const cases=[
    [400,{email:["Informe um endereço válido."]},"HTTP_ERROR","Informe um endereço válido."],
    [403,{detail:"Sem acesso."},"HTTP_ERROR","Sem acesso."],
    [409,{detail:{code:"MEAL_STATE",detail:"O estado mudou."}},"MEAL_STATE","O estado mudou."],
    [429,{error:{code:"AI_RATE_LIMITED",message:"Limite atingido."}},"AI_RATE_LIMITED","Limite atingido."],
    [503,{error:{code:"AI_PROVIDER_UNAVAILABLE",message:"Integração indisponível."}},"AI_PROVIDER_UNAVAILABLE","Integração indisponível."],
    [500,{detail:"stack trace including internals"},"HTTP_ERROR","O servidor encontrou uma falha."],
  ];
  for(const [status,payload,code,message] of cases){
    const fixture=mock(()=>json(payload,status));
    await sync(fixture);
    await assert.rejects(fixture.api.me(),{status,code,message});
  }
});

test("contratos de merenda, funcionários, contagens, relatórios e histórico",async()=>{
  const fixture=mock(({path,body,request})=>{
    if(path.endsWith("/start/"))return json({status:"PREPARING",attendance_snapshot:{total_student_entries:412},forecast:{forecast_plates:398}});
    if(path.endsWith("/start-serving/"))return json({status:"SERVING"});
    if(path.endsWith("/finish/"))return json({status:"FINISHED"});
    if(path==="invitations/"&&request.method==="POST"){
      assert.equal(body.role,"COOK");assert.deepEqual(body.school_ids,[school]);return json({status:"PENDING",delivery_status:"QUEUED"},201);
    }
    if(path==="invitations/")return json([{status:"EXPIRED"}]);
    if(path.includes("/revoke/"))return json({status:"REVOKED"});
    if(path.includes("student-counts/summary/"))return json({student_entries:412});
    if(path.includes("plate-counts/summary/")){assert.match(path,/meal_service=/);return json({served_plates:398});}
    if(path.includes("reports/export/"))return new Response(Buffer.from("%PDF-"),{status:200,headers:{"content-type":"application/pdf"}});
    return json(page([]));
  });
  await sync(fixture);
  const scope={organization:org};
  const service=await fixture.api.start(scope,meal);
  assert.equal(service.attendance_snapshot.total_student_entries,412);
  assert.equal(service.forecast.forecast_plates,398);
  assert.equal((await fixture.api.transition(scope,meal,"start-serving")).status,"SERVING");
  assert.equal((await fixture.api.transition(scope,meal,"finish")).status,"FINISHED");
  assert.equal((await fixture.api.invite(scope,{email:"cook@example.test",role:"COOK",school_ids:[school],all_schools_access:false})).status,"PENDING");
  assert.equal((await fixture.api.invites(scope))[0].status,"EXPIRED");
  assert.equal((await fixture.api.inviteAction(scope,meal,"revoke")).status,"REVOKED");
  assert.equal((await fixture.api.countSummary(scope,"student",{school})).student_entries,412);
  assert.equal((await fixture.api.countSummary(scope,"plate",{school,meal_service:meal})).served_plates,398);
  assert.equal(Buffer.from(await fixture.api.report(scope,{school},"pdf")).toString(),"%PDF-");
  assert.equal((await fixture.api.history(scope,"weekly",{school})).count,0);
});

test("links de conta aceitam somente rota e host previstos e entregam token como fragmento",async()=>{
  const token="aBcD0123_tokens_ValidSample";
  const link=credentialLink("https://app.reali.example/ativar/#token="+token,"app.reali.example");
  assert.deepEqual(link,{route:"/ativar",token});
  assert.equal(credentialLink("https://elsewhere.example/ativar/#token="+token,"app.reali.example"),null);
  assert.equal(credentialLink("/recuperar?token="+token).token,null);
  assert.equal(credentialLink("/ativar/#token=short").token,null);
  assert.equal(credentialLink("/perfil/#token="+token),null);
  const fixture=mock(({path,body,request})=>{
    assert.equal(body.token,token);
    assert.ok(!request.headers.Authorization);
    if(path.includes("verify/"))return json({token:["Convite expirado."]},400);
    return json({message:"Convite aceito."});
  });
  await assert.rejects(fixture.api.verifyInvite(token),{status:400,message:"Convite expirado."});
  assert.equal((await fixture.api.activate({token,password:"test-only-synthetic",password_confirmation:"test-only-synthetic"},false)).message,"Convite aceito.");
});
test("parâmetros técnicos usam o PUT autorizado e a versão retornada",async()=>{
  const parameters={event_kind:"STUDENT_ENTRY",trigger:"LINE_CROSSING",desired_fps:15,confidence_threshold:0.7,algorithm_version:"v1",
    counting_line:{start:{x:0.2,y:0.5},end:{x:0.8,y:0.5},direction:"NEGATIVE_TO_POSITIVE"}};
  const fixture=mock(({path,request,body})=>{
    assert.equal(path,"cameras/"+meal+"/configuration/");
    assert.equal(request.headers["X-Organization-ID"],org);
    if(request.method==="PUT")assert.deepEqual(body,parameters);
    return json({version:request.method==="PUT"?2:1,parameters});
  });
  await sync(fixture);
  const scope={organization:org};
  const original=await fixture.api.cameraConfig(scope,meal);
  assert.equal(original.version,1);
  assert.equal((await fixture.api.saveCameraConfig(scope,meal,original.parameters)).version,2);
});
