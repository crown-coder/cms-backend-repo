import dotenv from "dotenv";
import app from "./app";
// import { seedComplianceSections } from "./db/seedComplianceSections";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // await seedComplianceSections();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
};

startServer();
