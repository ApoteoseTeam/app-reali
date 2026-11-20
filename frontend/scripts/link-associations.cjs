const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const config=require("../app.json").expo;
const team=process.env.REALI_APPLE_TEAM_ID;
const bundle=process.env.REALI_IOS_BUNDLE_ID||config.android.package;
const pins=(process.env.REALI_ANDROID_SHA256||"").split(",").map(pin=>pin.trim().toUpperCase()).filter(Boolean);
assert.ok(/^[A-Z0-9]{10}$/.test(team||""),"Informe REALI_APPLE_TEAM_ID.");
assert.ok(/^[-A-Za-z0-9]+(?:\.[-A-Za-z0-9]+)+$/.test(bundle),"Bundle ID inválido.");
assert.ok(pins.length&&pins.every(pin=>/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(pin)),"Informe as impressões SHA-256 do certificado Android.");
const output=path.join(process.argv[2]||"dist/link-associations",".well-known");
fs.mkdirSync(output,{recursive:true});
function write(file,data){fs.writeFileSync(path.join(output,file),JSON.stringify(data,null,2)+"\n");}
write("assetlinks.json",[{relation:["delegate_permission/common.handle_all_urls"],target:{
  namespace:"android_app",package_name:config.android.package,sha256_cert_fingerprints:[...new Set(pins)]
}}]);
write("apple-app-site-association",{applinks:{details:[{appIDs:[team+"."+bundle],
  components:["/ativar","/ativar/","/recuperar","/recuperar/"].map(route=>({"/":route}))
}]}});
console.log("Arquivos de associação gerados em "+output);
