import mongoose from "mongoose";
import { OutputType, print } from "../helpers/print";
import Exception from "../errors/Exception";

mongoose.set("strictQuery", true);
const connect = async () => {
  try {
    let connection = await mongoose.connect(process.env.MONG_URI as string);
    print("Connect mongoose successfully", OutputType.SUCCESS);
    return connection;
  } catch (error) {
    const { code } = error as { code: number | string };
    if ((error as { code: number | string }).code == 800) {
      throw new Exception(Exception.WRONG_DB_USERNAME_PASSWORD);
    } else if (code == "ENOTFOUND") {
      throw new Exception(Exception.WRONG_DB_SERVERNAME);
    }
    throw new Exception(Exception.WRONG_DB_CANNOT_CONNECT);
  }
};
export default connect;
