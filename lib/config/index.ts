export type RuntimeEnvironment = 'development' | 'test' | 'production'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface AppConfig {
  env: RuntimeEnvironment
  logLevel: LogLevel
  validation: {
    unusuallyHighQuantityThreshold: number | null
  }
}

const DEFAULT_CONFIG: AppConfig = {
  env: 'development',
  logLevel: 'info',
  validation: {
    unusuallyHighQuantityThreshold: null,
  },
}

function toRuntimeEnvironment(value: string | undefined): RuntimeEnvironment {
  if (value === 'test' || value === 'production') {
    return value
  }

  return 'development'
}

function toLogLevel(value: string | undefined): LogLevel {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value
  }

  return 'info'
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    env: overrides.env ?? toRuntimeEnvironment(process.env.NODE_ENV),
    logLevel: overrides.logLevel ?? toLogLevel(process.env.LOG_LEVEL),
    validation: {
      unusuallyHighQuantityThreshold:
        overrides.validation?.unusuallyHighQuantityThreshold ??
        DEFAULT_CONFIG.validation.unusuallyHighQuantityThreshold,
    },
  }
}

export const config = loadConfig()
