## Usage

### Explicit app directory, if you were so inclined

```ts
import { MemphisEnv } from 'memphis-env';

const env = new MemphisEnv({
    appDir: '/path/to/application/local/dir'
});

## Standard usage for expected .env file

```ts
import { bootstrapMemphisEnv} from 'memphis-env/bootstrap';

const env = bootstrapMemphisEnv()
```

This sets us the env file reference for `./.env` in the root or the current working directory.

This has the same outcome as:

```ts
import { MemphisEnv } from 'memphis-env';

const env = new MemphisEnv();
```
