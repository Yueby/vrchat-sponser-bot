// 数据库查询脚本 - 检查用户数据
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User";
import VRChatBinding from "./src/models/VRChatBinding";
import Guild from "./src/models/Guild";

dotenv.config();

async function checkUserData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Connected to MongoDB");

    // 获取所有 guild
    const guilds = await Guild.find({});
    console.log(`\n📊 Total Guilds: ${guilds.length}`);

    for (const guild of guilds) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`🏰 Guild ID: ${guild.guildId}`);
      console.log(`${"=".repeat(60)}`);

      // 查询该 guild 的所有用户
      const users = await User.find({ guildId: guild.guildId });
      console.log(`\n👥 Total Users: ${users.length}`);

      if (users.length > 0) {
        console.log("\n--- User List ---");
        users.forEach((user, idx) => {
          console.log(`${idx + 1}. User ID: ${user.userId}`);
          console.log(`   Display Name: ${user.displayName || "N/A"}`);
          console.log(`   Type: ${user.userType || "discord"}`);
          console.log(`   Roles: ${user.roles?.join(", ") || "None"}`);
        });
      }

      // 查询该 guild 的所有绑定
      const bindings = await VRChatBinding.find({ guildId: guild.guildId });
      console.log(`\n🔗 Total Bindings: ${bindings.length}`);

      if (bindings.length > 0) {
        console.log("\n--- Binding List ---");
        bindings.forEach((binding, idx) => {
          console.log(`${idx + 1}. User ID: ${binding.userId}`);
          console.log(`   VRChat Name: ${binding.vrchatName}`);
          console.log(`   Bind Time: ${binding.bindTime || "N/A"}`);
        });
      }

      // 搜索测试：查找 "yueby"
      console.log(`\n🔍 Search Test for "yueby":`);

      const searchQuery = "yueby";
      const bindingResult = await VRChatBinding.findOne({
        guildId: guild.guildId,
        $or: [
          { vrchatName: new RegExp(searchQuery, "i") },
          { userId: searchQuery },
        ],
      });

      const userResult = await User.findOne({
        guildId: guild.guildId,
        $or: [
          { userId: searchQuery },
          { displayName: new RegExp(searchQuery, "i") },
        ],
      });

      console.log(`   Binding found: ${!!bindingResult}`);
      if (bindingResult) {
        console.log(`   - VRChat Name: ${bindingResult.vrchatName}`);
        console.log(`   - User ID: ${bindingResult.userId}`);
      }

      console.log(`   User found: ${!!userResult}`);
      if (userResult) {
        console.log(`   - Display Name: ${userResult.displayName}`);
        console.log(`   - User ID: ${userResult.userId}`);
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("✅ Query completed");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n📤 Disconnected from MongoDB");
  }
}

checkUserData();
