# Verify Paste Guard yourself

Paste Guard claims: **no network requests, no analytics, no remote code, permissions limited to `storage` plus eight AI chat sites, and nothing written to disk but your settings, counter, ignore hashes and personal dictionary words. Original values used by Restore live in memory only.** Here is how to check each claim in your own browser without trusting anyone. Use made-up data only.

## 1. Check the permissions
1. Open `chrome://extensions` and click **Details** on Paste Guard.
2. Under **Permissions** and **Site access** you should see only the AI sites listed below (chatgpt.com, claude.ai, gemini.google.com, perplexity.ai, www.perplexity.ai, copilot.microsoft.com, grok.com, chat.deepseek.com, chat.mistral.ai). There is no "all sites", no "tabs", no "history", no "clipboard read".

## 2. Confirm there is no network traffic
1. On `chrome://extensions`, turn on **Developer mode**.
2. Click **service worker** under Paste Guard. DevTools opens. Go to the **Network** tab and keep it open. It stays empty (the service worker only opens the welcome page on first install).
3. Right-click the Paste Guard toolbar icon and choose **Inspect popup**. Go to **Network**, then change a setting or open **Clear ignored items**. The list stays empty.
4. Open the welcome page, open DevTools, **Network** tab, press **Fill with fake sensitive data** and choose **Paste masked**. Nothing is requested.
5. On a supported site, open DevTools, **Network** tab, and paste a fake value such as `AKIA` followed by 16 capital letters, or `4111 1111 1111 1111`. The warning appears, you choose an option, and no request is caused by the paste.

## 3. See exactly what is stored
1. Right-click the toolbar icon, **Inspect popup**, open the **Console** and run:
   ```
   chrome.storage.local.get(null, console.log)
   ```
2. You will see `settings` (on/off, mode, detector switches, a counter) and, only if you used **Ignore**, `ignored` with a random `salt` and a list of 64-character hashes. There is no pasted text.
3. Use **Clear ignored items** in the popup and run the command again: the hash list is empty.

## 4. Check that Restore stays on your device
Restore shows your original values again in the AI's replies. Use made-up data.
1. Paste a fake email such as `jane@example.com` into a supported site and choose **Paste masked**. The message box shows a placeholder like `[EMAIL_1]`.
2. Right-click the toolbar icon, **Inspect popup**, open the **Console** and run:
   ```
   chrome.storage.session.get(null, console.log)
   ```
   You will see one `restore:<site>` entry holding the placeholder-to-value list. This is Chrome's memory-only extension storage: it is never written to disk and disappears when you close the browser. Entries expire after 4 hours.
3. Run `chrome.storage.local.get(null, console.log)`. The original value is **not** there. Only settings, the counter, ignore hashes and your dictionary words are.
4. Keep the **Network** tab of the chat page open while a reply containing the placeholder arrives. The reply is shown with your value, and the paste or restore makes no request.
5. Click **Send** in the chat (or look at what the page would submit): the message box still holds the placeholder, never the original value.
6. In the popup, press **Forget stored values now**. Run the `session` command again: the list is empty and restored text on the page returns to placeholders. Turning **Restore original values in replies** off does the same and stops it from storing anything.

Be aware: restored values are ordinary text on the page, so the website's own scripts could read them in principle, just as they can read anything else on the page. Turn Restore off if that matters to you.

## 5. Inspect the installed files
The extension's JavaScript is delivered to your browser and can be inspected in the installed package. Open `chrome://extensions`, click **Details** on Paste Guard, then open DevTools on its popup or service worker (**Inspect popup**, or **Inspect views** with Developer mode on) and browse its files in the **Sources** tab. The project's source code is not published.

## What this cannot prove
These checks show what the extension does in your browser. They do not replace reading the code, which is no longer public. If you find any behavior that contradicts this page, please report it as described in the "Report a bug or missed format" link on the website, using made-up data only.
