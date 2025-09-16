import { NextApiRequest, NextApiResponse } from "next";
import { api } from "@/server/api";
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await api(req, res);
};
export default handler;
