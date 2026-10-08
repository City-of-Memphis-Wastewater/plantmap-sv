## Usage

### Explicit app directory

```ts
import { MemphisSecret } from 'memphis-secret';

const config = new MemphisSecret({
    appDir: '/path/to/application/local/dir'
});

## Use the app name to make secret vault in the local app dir

```ts
import { bootstrapMemphisSecret } from 'memphis-secret/bootstrap';
import packageJson from '../../../package.json' with { type: 'json' };

const config = bootstrapMemphisSecret(packageJson.name)
```

This sets up the secret file reference for `~/.my-package/.memphis-secret/vault.db`.

## Default directory 

```ts
import { MemphisSecret } from 'memphis-secret';

const secret = new MemphisSecret();
```

This sets up the secret vault file reference for `~/.memphis-secret/values.json`.

## Vault Initialization

However you set up the vault, you must initialize it before you can use it.

```ts
secret.initializeVault()
```
