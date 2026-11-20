import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({config}:ConfigContext):ExpoConfig=>{
  const host=process.env.REALI_LINK_HOST?.trim().toLowerCase();
  if(host&&!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(host)){
    throw new Error("REALI_LINK_HOST deve conter somente o domínio HTTPS.");
  }
  return {
    ...config, name:"Reali", slug:config.slug??"app-realimenta", scheme:"reali",
    extra:{...config.extra,linkHost:host??null},
    ios:{...config.ios,bundleIdentifier:process.env.REALI_IOS_BUNDLE_ID??config.ios?.bundleIdentifier??"com.guilhermesandrade.apprealimenta",
      associatedDomains:host?[`applinks:${host}`]:[]},
    android:{...config.android,googleServicesFile:process.env.REALI_GOOGLE_SERVICES_FILE??config.android?.googleServicesFile,
      intentFilters:host?[{action:"VIEW",autoVerify:true,
      data:["/ativar","/recuperar"].map(pathPrefix=>({scheme:"https",host,pathPrefix})),
      category:["BROWSABLE","DEFAULT"]}]:[]},
  };
};
