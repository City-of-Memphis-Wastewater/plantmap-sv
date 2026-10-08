## Usage

### Explicit app directory

```ts
import { MemphisConfig } from 'memphis-config';

const config = new MemphisConfig({
    appDir: '/path/to/application/local/dir'
});

## Use the app name to make config in the local app dir

```ts
import { bootstrapMemphisConfig } from 'memphis-config/bootstrap';
import packageJson from '../../../package.json' with { type: 'json' };

config = bootstrapMemphisConfig(packageJson.name)
```

This sets us the config file reference for `~/.my-package/.memphis-config/values.json`.
