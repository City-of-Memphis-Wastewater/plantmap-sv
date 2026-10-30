export function validate_port(
    port: unknown,
    name = 'Port'
): number {
    const value = Number(port);

    if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 65535
    ) {
        throw new Error(`${name} must be an integer between 1 and 65535.`);
    }

    return value;
}
