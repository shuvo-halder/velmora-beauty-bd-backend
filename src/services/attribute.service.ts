import { api } from "../lib/api";

export const getAttributes = async (): Promise<any[]> => {
  const { data } = await api.get("/attributes");
  return data.data;
};

export const createAttribute = async (name: string): Promise<any> => {
  const { data } = await api.post("/attributes", { name });
  return data.data;
};

export const createAttributeValue = async (attributeId: string, value: string): Promise<any> => {
  const { data } = await api.post("/attribute-values", { attributeId, value });
  return data.data;
};
