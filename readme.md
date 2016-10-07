SONIA - SIA APP CHALLENGE
=========================

This is the super awesome machine learning project created by team **WXYZ**. **SONIA** is a hyper intelligent bot that understands context, and will be able to provide appropriate responses to users depending on their context. SONIA is built to be platform agnostic. While it currently only runs on Facebook Messenger, she can be easily extended to reply Telegram messages, Whatsapp messages, SMS-es etc. 

Note that SONIA is built with Node.JS due to its websocket prowess, and is highly performant as an intelligent chat bot. 

----------

Getting Started
-------------
All you need to do is to ensure you have node.js as well as mongodb installed. Make sure port 8080 as well as port 27017 are free. This will allow you to run the bot. However, since we've hooked SONIA up to FB messenger only via webhook, it will perform nothing on a local machine for now.

Features Included
-----------------

- Super awesome machine learning bot that is able to reply to user's message
- Able to send directions, send flight details, send flight reminder notifications, find out about weather etc
- Dashboard to allow administrators to learn about user's emotions as well as sentiments
- View simple analytics about the number of users interacting with chat bot

Packages Used
-------------

> **Note:**
> - We've used packages that are well-maintained and supported by the Node.JS community

- Express.JS 
- request.js
- limdu.js (Machine Learning)
- facebook-messenger (Used as the chat bot)
- Serve-static (Used to serve the dashboard)

