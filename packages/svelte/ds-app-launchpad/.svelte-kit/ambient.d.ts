
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const SHELL: string;
	export const LSCOLORS: string;
	export const npm_command: string;
	export const tmux_conf_theme_24b_colour: string;
	export const COLORTERM: string;
	export const LESS: string;
	export const NVM_INC: string;
	export const TERM_PROGRAM_VERSION: string;
	export const RDP_HOST: string;
	export const TMUX: string;
	export const SWAYRUNNING: string;
	export const I3SOCK: string;
	export const _P9K_TTY: string;
	export const NODE: string;
	export const SSH_AUTH_SOCK: string;
	export const XDG_DATA_HOME: string;
	export const P9K_TTY: string;
	export const XDG_CONFIG_HOME: string;
	export const TMUX_PLUGIN_MANAGER_PATH: string;
	export const npm_config_local_prefix: string;
	export const SSH_AGENT_PID: string;
	export const XCURSOR_SIZE: string;
	export const EDITOR: string;
	export const XDG_SEAT: string;
	export const PWD: string;
	export const LOGNAME: string;
	export const XDG_SESSION_TYPE: string;
	export const LERNA_PACKAGE_NAME: string;
	export const BUN_WHICH_IGNORE_CWD: string;
	export const _: string;
	export const ZSH_TMUX_CONFIG: string;
	export const MOTD_SHOWN: string;
	export const NX_ISOLATE_PLUGINS: string;
	export const HOME: string;
	export const RDP_KEYNAME: string;
	export const LANG: string;
	export const LS_COLORS: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const npm_package_version: string;
	export const _ZSH_TMUX_FIXED_CONFIG: string;
	export const NX_TASK_TARGET_PROJECT: string;
	export const SWAYSOCK: string;
	export const WAYLAND_DISPLAY: string;
	export const NX_LOAD_DOT_ENV_FILES: string;
	export const FORCE_COLOR: string;
	export const NX_CLI_SET: string;
	export const INIT_CWD: string;
	export const XDG_CACHE_HOME: string;
	export const npm_lifecycle_script: string;
	export const NVM_DIR: string;
	export const VIM: string;
	export const XDG_SESSION_CLASS: string;
	export const TERM: string;
	export const npm_package_name: string;
	export const ZSH: string;
	export const NX_TASK_HASH: string;
	export const USER: string;
	export const TMUX_PANE: string;
	export const tmux_conf_copy_to_os_clipboard: string;
	export const NX_WORKSPACE_ROOT: string;
	export const RDP_USERNAME: string;
	export const DISPLAY: string;
	export const npm_lifecycle_event: string;
	export const SHLVL: string;
	export const NVM_CD_FLAGS: string;
	export const MOZ_ENABLE_WAYLAND: string;
	export const PAGER: string;
	export const _P9K_SSH_TTY: string;
	export const XDG_VTNR: string;
	export const NX_TASK_TARGET_TARGET: string;
	export const XDG_SESSION_ID: string;
	export const npm_config_user_agent: string;
	export const npm_execpath: string;
	export const XDG_RUNTIME_DIR: string;
	export const ZSH_TMUX_TERM: string;
	export const DEBUGINFOD_URLS: string;
	export const npm_package_json: string;
	export const BUN_INSTALL: string;
	export const P9K_SSH: string;
	export const npm_config_legacy_peer_deps: string;
	export const tmux_conf_new_pane_retain_current_path: string;
	export const PATH: string;
	export const XDG_SCREENSHOTS_DIR: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const NVM_BIN: string;
	export const MAIL: string;
	export const tmux_conf_new_session_prompt: string;
	export const npm_node_execpath: string;
	export const tmux_conf_new_pane_reconnect_ssh: string;
	export const tmux_conf_new_window_retain_current_path: string;
	export const OLDPWD: string;
	export const TERM_PROGRAM: string;
	export const MODEM_ID: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		SHELL: string;
		LSCOLORS: string;
		npm_command: string;
		tmux_conf_theme_24b_colour: string;
		COLORTERM: string;
		LESS: string;
		NVM_INC: string;
		TERM_PROGRAM_VERSION: string;
		RDP_HOST: string;
		TMUX: string;
		SWAYRUNNING: string;
		I3SOCK: string;
		_P9K_TTY: string;
		NODE: string;
		SSH_AUTH_SOCK: string;
		XDG_DATA_HOME: string;
		P9K_TTY: string;
		XDG_CONFIG_HOME: string;
		TMUX_PLUGIN_MANAGER_PATH: string;
		npm_config_local_prefix: string;
		SSH_AGENT_PID: string;
		XCURSOR_SIZE: string;
		EDITOR: string;
		XDG_SEAT: string;
		PWD: string;
		LOGNAME: string;
		XDG_SESSION_TYPE: string;
		LERNA_PACKAGE_NAME: string;
		BUN_WHICH_IGNORE_CWD: string;
		_: string;
		ZSH_TMUX_CONFIG: string;
		MOTD_SHOWN: string;
		NX_ISOLATE_PLUGINS: string;
		HOME: string;
		RDP_KEYNAME: string;
		LANG: string;
		LS_COLORS: string;
		XDG_CURRENT_DESKTOP: string;
		npm_package_version: string;
		_ZSH_TMUX_FIXED_CONFIG: string;
		NX_TASK_TARGET_PROJECT: string;
		SWAYSOCK: string;
		WAYLAND_DISPLAY: string;
		NX_LOAD_DOT_ENV_FILES: string;
		FORCE_COLOR: string;
		NX_CLI_SET: string;
		INIT_CWD: string;
		XDG_CACHE_HOME: string;
		npm_lifecycle_script: string;
		NVM_DIR: string;
		VIM: string;
		XDG_SESSION_CLASS: string;
		TERM: string;
		npm_package_name: string;
		ZSH: string;
		NX_TASK_HASH: string;
		USER: string;
		TMUX_PANE: string;
		tmux_conf_copy_to_os_clipboard: string;
		NX_WORKSPACE_ROOT: string;
		RDP_USERNAME: string;
		DISPLAY: string;
		npm_lifecycle_event: string;
		SHLVL: string;
		NVM_CD_FLAGS: string;
		MOZ_ENABLE_WAYLAND: string;
		PAGER: string;
		_P9K_SSH_TTY: string;
		XDG_VTNR: string;
		NX_TASK_TARGET_TARGET: string;
		XDG_SESSION_ID: string;
		npm_config_user_agent: string;
		npm_execpath: string;
		XDG_RUNTIME_DIR: string;
		ZSH_TMUX_TERM: string;
		DEBUGINFOD_URLS: string;
		npm_package_json: string;
		BUN_INSTALL: string;
		P9K_SSH: string;
		npm_config_legacy_peer_deps: string;
		tmux_conf_new_pane_retain_current_path: string;
		PATH: string;
		XDG_SCREENSHOTS_DIR: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		NVM_BIN: string;
		MAIL: string;
		tmux_conf_new_session_prompt: string;
		npm_node_execpath: string;
		tmux_conf_new_pane_reconnect_ssh: string;
		tmux_conf_new_window_retain_current_path: string;
		OLDPWD: string;
		TERM_PROGRAM: string;
		MODEM_ID: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
