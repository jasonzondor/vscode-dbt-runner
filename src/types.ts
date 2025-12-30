export interface SnowflakeConfig {
    name: string;
    account: string;
    user: string;
    privateKeyPath: string;
    privateKeyPassphrase?: string;
}

/**
 * Normalizes a file path to use forward slashes for cross-platform compatibility.
 * This is particularly important for Windows paths that will be passed to Python/dbt,
 * as backslashes can be misinterpreted.
 * 
 * @param filePath - The file path to normalize
 * @returns The normalized path with forward slashes, or the original path if it's empty
 */
export function normalizePathForPython(filePath: string): string {
    if (!filePath || filePath.trim() === '') {
        return filePath;
    }
    // Replace all backslashes with forward slashes for Python/dbt compatibility
    return filePath.replace(/\\/g, '/');
}
