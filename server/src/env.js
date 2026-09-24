import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverEnv = path.resolve(here, '..', '.env');
const rootEnv = path.resolve(here, '..', '..', '.env');

// Permite ejecutar tanto `npm --prefix server ...` (cwd server) como el
// comando raíz sin tener dos archivos de configuración distintos.
dotenv.config({ path: serverEnv });
dotenv.config({ path: rootEnv });
