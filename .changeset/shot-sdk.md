---
"@uberscene/sdk": minor
---

3D shots in the editor's actions. `shot/set` writes an object's channel, a camera field or an input of a `<Three shot>`; `key/add`, `key/update`, `key/move`, `key/remove` and `key/setAll` take `objects.<id>.<channel>`, `camera.<field>` and `inputs.<name>`, in shot time, and find a key tied to a marker by the marker's time. The resolver checks a shot's props against what it declares and turns `"marker:ID"` into shot time. Trimming a shot's head moves its `in` with its `start`. A video file's own modules may be plain `.js`.
