import type { NextApiRequest, NextApiResponse } from "next";

type HealthCheckResponse = {
  status: string;
  timestamp: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>,
) {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
}
