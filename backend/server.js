import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import webpush from "web-push";
import cors from "cors";
import {Client} from "pg";
import imap from "imap-simple";
import {simpleParser} from "mailparser";
import path from "path";
import { fileURLToPath, fileURLToPathBuffer } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
    path: path.join(__dirname,".env")
});
//configuration for the imap protocol
const imapConfig = {
     imap: {
        user: process.env.EMAIL,
        password: process.env.EMAIL_APP_PASS,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        authTimeout: 10000,
        tlsOptions:{
            rejectUnauthorized:false
        }
  }
}
//functions needed
async function scanEmails(imapConfig){
    //gets last hour emails
    const con = await imap.connect(imapConfig);
    await con.openBox("INBOX");

    const cutoff = new Date(Date.now()-60*60*1000);
    const today = new Date().toDateString();

    const criteria = [
        "ALL",
        ["SINCE",today],
    ]

    const options ={ 
        bodies:[""],
        markSeen:false
    }
    const messages  = await con.search(criteria,options);
    const emails = [];
    for(const message of messages){
        const raw  = message.parts[0].body;
        const parsed = await simpleParser(raw);
        if(parsed.date>=cutoff){
            emails.push({
                from:parsed.from?.text,
                subject:parsed.subject?.text,
                date:parsed.date,
                text:parsed.text,
                html:parsed.html
            })
        }
    }
    
    await con.end();
    return emails;
}
async function storeEmails(email){
    const query = `
        INSERT INTO emails (email)
        VALUES ($1::jsonb)
    `;
    try{
        let result  = await client.query(query,[email]);
        return result;
    }catch(err){
        return null;
    }
}
async function getEmails(){
    const query = "SELECT * from emails";
    try{
        let result = await client.query(query);
        return result.rows;
    }catch(err){
        return null;
    }
}

async function getSubscriptions(){
    const query="SELECT subscriptions FROM subscriptions"
    try{
        let result = await client.query(query);
        let rows = result.rows;
        return rows;
    }catch(err){    
        return null;
    }
}
async function updateSubscriptions(subscription){
    const query =  `
         INSERT INTO subscriptions (subscriptions)
         VALUES ($1::jsonb)
     `
    try{
        let result = await client.query(query,[subscription]);
        return result;
    }catch(err){    
        return null;
    }
    
}
function cleanText(text){
    if (!text) return '';
  // Remove everything before the actual message
  let cleantext = text
    .replace(/^[\s\S]*?Subject:\s*\n/i, '') // remove headers
    .replace(/\nDisclaimer[\s\S]*/i, '')    // remove disclaimer
    .replace(/\[https?:\/\/.*?\]/g, '')     // remove image links
    .trim();

  // Remove excessive newlines
  cleantext = cleantext.replace(/\n{2,}/g, '\n').trim();

  return cleantext;
}
const app  = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname,"../frontend")));

const client = new Client({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

//to set the details of the server's vapid identity
webpush.setVapidDetails(
    "mailto:test@example.com",
    process.env.PUBLIC_KEY,
    process.env.PRIVATE_KEY
)
//route to save a subscription endpoint from a device to send push notifications in future
app.post("/subscribe",async(req,res)=>{
    const subscription  = req.body.subscription;
    //updation in DB
    let result = await updateSubscriptions(subscription);
    if(result){
        res.status(200).json({
            status:"success",
            description:"The subscription updation was successful"
        })
    }
    else{
        res.status(408).json({
            status:"error",
            description:"error encountered during process"
        })
    }

})  
//route to fetch the emails from DB to present in app
app.get("/fetch",async(req,res)=>{
    let emails = await getEmails();
    if(emails){
        res.status(200).json({
            status:"success",
            emails:emails
        })
    }
    else{
        res.status(408).json({
            status:"error",
            description:"error occurred in retrieval"
        })
    }
})
//cron task scheduler to scan emails , save in DB and send notifications hourly
cron.schedule("*0 * * * *",async ()=>{
    let emails =  await scanEmails(imapConfig);
    let dbemails = await getEmails();
    let filtered_emails = [];
    const keywords = [
    "submit", "submission", "assignment", "homework", "project",
    "report", "deliverable", "task", "form", "registration", "enroll",
    "due", "deadline", "urgent", "important", "immediate",
    "link", "url", "download", "attachment", "file", "document", "portal",
    "confirm", "confirmation", "approved", "acceptance", "received", "verification",
    "please submit", "action required", "fill out", "click here", "complete by", "upload your"
    ];
    let check_emails = [];
    for(const email of emails){
        if(keywords.some(subtext=>(email.text||"").toLowerCase().includes(subtext))){
            email.text = cleanText(email.text);
            filtered_emails.push(email);
        }
    }
    let subscriptions = await getSubscriptions();
    for(const femail of filtered_emails){
        let con = false;
        for(const email of dbemails){
            if(femail.text==email.email.text){
                con = true;
            }
        }
        if(!con){
            check_emails.push(femail);
            await storeEmails(femail);
        }
    }
    if(check_emails.length>0){
        //to send push notifications to each subscription endpoint stored
        for(const sub of subscriptions){
        webpush.sendNotification(sub.subscriptions,JSON.stringify({
            title:"New Reminder",
            body:"New email(s) detected"
        }));
    }
    }

})
app.listen(process.env.PORT,()=>{
    console.log("Server started at:",process.env.PORT);
})