# 41｜卡金王室機密檔案

這份 ZIP 收錄目前「41｜卡金王室機密檔案」網站的原始檔，包含首頁、閱讀器、五篇示範短篇、管理介面及可自行部署的 Cloudflare Worker 程式。解壓縮後會得到 `kakin-royal-archive` 資料夾。

## 檔案與功能

| 檔案 | 用途 |
| --- | --- |
| `dist/index.html`、`dist/style.css`、`dist/app.js` | 讀者頁、版面與閱讀器 |
| `dist/content.json` | 五篇內建的示範短篇；靜態瀏覽時的內容來源 |
| `dist/admin.html`、`dist/admin.css`、`dist/admin.js` | 管理頁面，需連接後端與設定管理密碼才能登入、編輯及上傳圖片 |
| `dist/server/index.js`、`worker.js` | Cloudflare Worker 後端程式；兩份內容相同，`wrangler.json` 使用前者 |
| `wrangler.json` | Workers 的部署設定，尚需填入自己建立的 D1 資料庫 ID |

這份程式碼沒有封裝網站上日後新增或修改的線上資料庫內容、上傳圖片、管理密碼或工作階段。如已有管理頁內容，請先從原站管理頁下載備份；備份不會自動匯入這個新部署。

## 上傳自己的 Git 儲存庫

請將解壓縮後 `kakin-royal-archive` **資料夾內的檔案**上傳至自己的儲存庫，而非只上傳 ZIP。可以用 GitHub Desktop；若使用命令列，在該資料夾執行：

```bash
git init -b main
git add .
git commit -m "Add Kakin royal archive website"
git remote add origin YOUR_REPOSITORY_GIT_URL
git push -u origin main
```

請把 `YOUR_REPOSITORY_GIT_URL` 換成自己空白儲存庫的 URL。若儲存庫已存在，直接複製檔案並提交，不必再次執行 `git init`。

Git 可以保存原始碼。只使用 GitHub Pages 時，`dist` 內的示範文章與閱讀介面可作為靜態網站使用；`/api/`、登入、編輯及上傳圖片需要 Cloudflare Workers 與 D1。若 GitHub Pages 使用專案子目錄網址，程式中以 `/` 開頭的首頁或管理頁路徑也可能需要調整。

## 在電腦預覽讀者頁

電腦有安裝 Python 時，可在專案根目錄執行：

```bash
python -m http.server 8000 --directory dist
```

然後開啟 `http://localhost:8000`。Windows 也可使用 `py -m http.server 8000 --directory dist`。讀者頁在 `/api/records` 不可用時會讀取 `dist/content.json`；這個純靜態預覽無法登入管理頁。

## 保留管理介面：部署到自己的 Cloudflare

需要 Node.js 與 npm（用來執行 Wrangler），並在自己的 Cloudflare 帳戶建立 D1 資料庫。先在專案根目錄執行：

```bash
npx wrangler login
npx wrangler d1 create royal-archive
```

第二個指令會回傳資料庫 ID。打開 `wrangler.json`，在 `d1_databases` 陣列的資料庫項目加入 `"database_id": "剛取得的 ID"`；保留綁定名稱 `DB`，資料庫名稱應與自己建立的名稱一致。`assets.directory` 已設定為 `dist`，Worker 程式入口為 `dist/server/index.js`。

接著部署並設定管理密碼：

```bash
npx wrangler deploy --config wrangler.json
npx wrangler secret put ARCHIVE_ADMIN_KEY --config wrangler.json
```

後一個指令會提示你輸入自訂密碼，請輸入你自己要用的密碼，**不要把密碼寫進檔案或提交到 Git**。部署完成後，開啟 Worker 網址的 `/admin.html` 登入。日後可在管理頁更改密碼；變更後的密碼雜湊儲存在 D1 中。此版管理頁**需要密碼**，與另一個免登入編輯的網站不同。

第一次 API 請求會建立 D1 資料表，並用五篇示範短篇初始化全新的資料庫。若重新部署到另一個 Cloudflare 帳戶，舊站已新增的文章或圖片不會跟著 Git 原始碼搬過去。

## 參考資料

- [Cloudflare D1 的 Wrangler 指令](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Workers 的 Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers 部署指令](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
