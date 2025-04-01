require("dotenv").config();
const chalk = require("chalk");

/**
 * Verify required environment variables are set
 */
function verifyEnvironment() {
  const requiredVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PORT"];

  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error(chalk.red("Error: Missing required environment variables:"));
    missingVars.forEach((varName) => {
      console.error(chalk.red(`  - ${varName}`));
    });
    console.error(
      chalk.yellow(
        "\nPlease create a .env file with these variables. See .env.example for reference."
      )
    );
    process.exit(1);
  }

  console.log(chalk.green("✓ Environment configuration verified"));
}

/**
 * Initialize the server setup
 */
function initializeServer() {
  console.log(chalk.blue("Initializing admin server..."));
  verifyEnvironment();
  console.log(chalk.green("✓ Server initialized successfully"));
  console.log(chalk.blue(`Server will run on port ${process.env.PORT}`));
}

// Export for use in index.js
module.exports = {
  verifyEnvironment,
  initializeServer,
};

// Run directly if this script is executed directly
if (require.main === module) {
  initializeServer();
}
