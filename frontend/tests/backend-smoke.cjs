const {randomUUID}=require("node:crypto");
const assert=require("node:assert/strict");
const {HttpClient,apiBase}=require("../.test-build/api/client.js");
const {RealiApi}=require("../.test-build/api/reali.js");
const {SessionTokens}=require("../.test-build/session/tokens.js");

async function main(){
  let stored=null;
  const tokens=new SessionTokens({read:async()=>stored,write:async value=>{stored=value;}});
  const http=new HttpClient(()=>apiBase(process.env.REALI_SMOKE_URL,true),tokens);
  tokens.attach(http);
  const api=new RealiApi(http);
  const credentials=await api.login("mobile-smoke@example.test",process.env.REALI_SMOKE_PASSWORD);
  await tokens.accept(credentials,tokens.credentials().generation);
  const me=await api.me();
  const org=(await api.organizations()).find(item=>item.name==="Rede Mobile");
  assert.ok(org&&me.memberships.find(item=>item.organization===org.id).capabilities.includes("prepare"));
  const scope={organization:org.id};
  const school=(await api.schools(scope)).find(item=>item.name==="Escola Mobile");
  if(process.env.REALI_SMOKE_OUTSIDE)await assert.rejects(api.schools({organization:process.env.REALI_SMOKE_OUTSIDE}),{status:403});
  assert.equal((await api.profile("Direção Mobile").then(user=>user.email)),me.user.email);
  const dashboard=await api.dashboard(scope,{school:school.id});
  assert.equal(dashboard.total_student_entries,25);
  const date=dashboard.reference_date;
  const counts=await api.countSummary(scope,"student",{school:school.id,date});
  assert.equal(counts.student_entries,25);
  const meal=(await api.meals(scope,{school:school.id,date})).results.find(item=>item.status==="PLANNED");
  assert.ok(meal,"Crie um novo banco de teste ou replante o serviço sintético.");
  const started=await api.start(scope,meal.id);
  assert.equal(started.attendance_snapshot.total_student_entries,25);
  assert.equal(started.forecast.forecast_plates,20);
  assert.equal((await api.transition(scope,meal.id,"start-serving")).status,"SERVING");
  assert.equal((await api.transition(scope,meal.id,"finish")).status,"FINISHED");
  const inbox=await api.notices(scope,{school_id:school.id,type:"MEAL_SERVICE_FINISHED"});
  assert.equal(inbox.count,1);
  const notice=await api.notice(scope,school.id,inbox.results[0].id);
  assert.equal(notice.data.resource_id,meal.id);
  const yesterday=new Date(date+"T12:00:00Z");
  yesterday.setUTCDate(yesterday.getUTCDate()-1);
  const prior=yesterday.toISOString().slice(0,10);
  assert.equal((await api.countSummary(scope,"plate",{school:school.id,date:prior})).served_plates,19);
  const history=await api.history(scope,"daily",{school:school.id,start_date:prior,end_date:date});
  assert.equal(history.results.length,2);
  assert.match(Buffer.from(await api.report(scope,{school:school.id,date},"pdf")).toString("ascii",0,5),/^%PDF-/);
  const cameras=(await api.cameras(scope,{school:school.id})).results;
  const entrance=cameras.find(item=>item.camera_type==="ENTRANCE");
  assert.ok(cameras.length>=2&&entrance);
  const parameters={
    event_kind:"STUDENT_ENTRY",trigger:"LINE_CROSSING",desired_fps:15,
    confidence_threshold:0.7,algorithm_version:"mobile-fixture",
    counting_line:{start:{x:0.2,y:0.5},end:{x:0.8,y:0.5},direction:"NEGATIVE_TO_POSITIVE"},
  };
  const configured=await api.saveCameraConfig(scope,entrance.id,parameters);
  const confirmed=await api.cameraConfig(scope,entrance.id);
  assert.equal(confirmed.version,configured.version);
  assert.deepEqual(confirmed.parameters,parameters);
  assert.ok((await api.employees(scope,{})).results.length>=1);
  const thread=await api.createConversation(scope,school.id,"Teste de integração");
  const chat={conversation_id:thread.id,school_id:school.id,client_request_id:randomUUID(),message:"Quantos pratos foram servidos ontem?"};
  const answer=await api.chat(scope,chat);
  assert.equal(answer.status,"COMPLETED");
  assert.match(answer.answer,/pratos servidos 19/);
  assert.equal((await api.chat(scope,chat)).message_id,answer.message_id);
  assert.equal((await api.messages(scope,thread.id)).count,2);
  const beforeRotation=stored;
  assert.ok(await tokens.restore());
  assert.notEqual(stored,beforeRotation);
  const lastAccess=tokens.credentials().access;
  await tokens.logout();
  assert.equal(stored,null);
  const ended=await fetch(apiBase(process.env.REALI_SMOKE_URL,true)+"/auth/me/",{
    headers:{Authorization:"Bearer "+lastAccess},
  });
  assert.equal(ended.status,401);
  console.log("Django HTTP validado: JWT, organização, escola, perfil, dashboard, contagens, merenda, previsão, histórico, PDF, câmeras, funcionários e RealInova.");
}
main().catch(error=>{console.error(error.name+": "+error.message);process.exitCode=1;});
