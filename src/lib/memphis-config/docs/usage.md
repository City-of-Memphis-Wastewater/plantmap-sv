## Usage

### Explicit app directory

````ts
import { MemphisConfig } from 'memphis-config';

const config = new MemphisConfig({
    appDir: '/path/to/application/local/dir'
});

## Use the app name to make config in the local app dir

```ts
import { bootstrapMemphisConfig } from 'memphis-config/bootstrap';
import packageJson from '../../../package.json' with { type: 'json' };

const config = bootstrapMemphisConfig(packageJson.name)
````

This sets up the config file reference for `~/.my-package/.memphis-config/values.json`.

## Default directory

```ts
import { MemphisConfig } from 'memphis-config';

const config = new MemphisConfig();
```

This sets up the config file reference for `~/.memphis-config/values.json`.

---
