export interface Provider {
  id: string;
  name: string;
  aliases: string[];
  wallet: string;
  verified: boolean;
}

export const providers: Provider[] = [
  {
    id: "clinic_001",
    name: "Happy Paw Vet Clinic",
    aliases: ["happy paw", "happy paw vet", "happy paw clinic"],
    wallet: "0x1111111111111111111111111111111111111111",
    verified: true
  }
];

export function findProviderByName(input: string): Provider | undefined {
  const normalized = input.trim().toLowerCase();

  return providers.find((provider) => {
    const names = [provider.name, ...provider.aliases].map((name) => name.toLowerCase());
    return names.some((name) => normalized.includes(name) || name.includes(normalized));
  });
}
