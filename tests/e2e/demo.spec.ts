import { expect, test } from "@playwright/test";
test.beforeEach(async({page})=>{page.on("pageerror",e=>console.log("PAGEERROR",e.message));await page.goto("/demo");await page.evaluate(()=>localStorage.clear());await page.reload();});
test("core demo workflow and persistence",async({page},testInfo)=>{
 await expect(page.getByText("Локальное демо")).toBeVisible();
 await page.getByRole("button",{name:"+ Заявка"}).click(); await expect(page.getByRole("heading",{name:"Новая заявка"})).toBeVisible();
 await page.getByLabel("Название").fill("Новый бренд-сайт"); await page.getByLabel("Бюджет, ₽").fill("120000"); await page.getByRole("button",{name:"Создать заявку"}).click();
 await page.reload(); await page.getByRole("button",{name:"Заявки",exact:true}).first().click(); await expect(page.getByText("Новый бренд-сайт")).toBeVisible();
 await page.getByText("Новый бренд-сайт").click(); await page.getByLabel("Новая заметка").fill("Уточнить сроки"); await page.getByRole("button",{name:"Добавить заметку"}).click(); await expect(page.getByText("Уточнить сроки")).toBeVisible();
 await page.getByRole("button",{name:"Переместить в архив"}).click(); await page.getByLabel("Закрыть").click(); await page.getByRole("button",{name:"Архив"}).click(); await expect(page.getByText("Новый бренд-сайт")).toBeVisible();
 await page.getByText("Новый бренд-сайт").click(); await page.getByRole("button",{name:"Восстановить из архива"}).click();
 await page.keyboard.press("Escape"); await page.keyboard.press("/"); await expect(page.getByLabel("Поиск")).toBeFocused();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);expect(overflow).toBe(true);
 await page.screenshot({path:`artifacts/screenshots/${testInfo.project.name}-demo.png`,fullPage:true});
});
test("configured cloud mode exposes auth without mutating Supabase",async({page})=>{
 await page.goto("/app");
 await expect(page.getByRole("heading",{name:"Войти в Relay"})).toBeVisible();
 await expect(page.getByLabel("Почта")).toBeVisible();
 await expect(page.getByLabel("Пароль")).toBeVisible();
 await expect(page.getByRole("button",{name:"Войти",exact:true})).toBeVisible();
});
test("unconfigured cloud mode reports both missing public settings",async({page})=>{
 await page.goto("http://localhost:3241/app");
 await expect(page.getByRole("heading",{name:"Требуется подключение Supabase"})).toBeVisible();
 await expect(page.getByText("не настроено",{exact:true})).toHaveCount(2);
});



