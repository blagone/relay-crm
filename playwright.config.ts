import { defineConfig, devices } from "@playwright/test";
export default defineConfig({testDir:"./tests/e2e",workers:1,use:{baseURL:"http://localhost:3240",channel:"msedge",trace:"retain-on-failure"},webServer:{command:"npm run dev -- --port 3240",url:"http://localhost:3240",reuseExistingServer:true,timeout:120000},projects:[{name:"desktop",use:{...devices["Desktop Edge"]}},{name:"mobile",use:{viewport:{width:390,height:844},channel:"msedge"}}]});

