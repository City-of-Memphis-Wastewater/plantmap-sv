//
export interface PlantMapSecrets {
    eds: {
        username: string;
        password: string;
    };
}

export interface SecretStore {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
}

export async function loadSecrets(): Promise<PlantMapSecrets> {
    // get username/password from SecretStore
}
