export class Logger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'info';
        this.logToFile = options.logToFile !== false;
        this.logToConsole = options.logToConsole !== false;
        this.maxLogSize = options.maxLogSize || 1000;
        this.logs = [];
        
        // Log levels and their colors
        this.levels = {
            debug: { color: '#808080', emoji: '🔍' },
            info: { color: '#00ff00', emoji: 'ℹ️' },
            warn: { color: '#ffa500', emoji: '⚠️' },
            error: { color: '#ff0000', emoji: '❌' }
        };

        // Comment out log display initialization
        // this.initializeLogDisplay();
    }

    initializeLogDisplay() {
        // Comment out display creation
        /*
        if (!document.getElementById('log-display')) {
            const logDisplay = document.createElement('div');
            logDisplay.id = 'log-display';
            logDisplay.className = 'log-display';
            document.body.appendChild(logDisplay);
        }
        */
    }

    formatMessage(level, message, error = null) {
        const timestamp = new Date().toISOString();
        const { emoji } = this.levels[level];
        
        let formattedMessage = `${emoji} [${timestamp}] ${message}`;
        
        if (error) {
            formattedMessage += `\nError: ${error.message}`;
            if (error.stack) {
                formattedMessage += `\nStack: ${error.stack}`;
            }
        }

        return formattedMessage;
    }

    log(level, message, error = null) {
        const formattedMessage = this.formatMessage(level, message, error);
        
        // Add to logs array
        this.logs.push({
            timestamp: Date.now(),
            level,
            message: formattedMessage
        });

        // Trim logs if exceeding max size
        if (this.logs.length > this.maxLogSize) {
            this.logs = this.logs.slice(-this.maxLogSize);
        }

        // Console output
        if (this.logToConsole) {
            const { color } = this.levels[level];
            console.log(`%c${formattedMessage}`, `color: ${color}`);
        }

        // Comment out display updates
        // this.updateLogDisplay();

        // Save to file
        if (this.logToFile) {
            this.saveToFile();
        }
    }

    updateLogDisplay() {
        // Comment out display updates
        /*
        const display = document.getElementById('log-display');
        if (display) {
            const recentLogs = this.logs.slice(-5).map(log => {
                const { color } = this.levels[log.level];
                return `<div style="color: ${color}">${log.message}</div>`;
            }).join('');
            
            display.innerHTML = recentLogs;
        }
        */
    }

    async saveToFile() {
        try {
            const logText = this.logs.map(log => log.message).join('\n');
            const blob = new Blob([logText], { type: 'text/plain' });
            
            // Save using File System Access API if available
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `app-log-${new Date().toISOString()}.txt`,
                    types: [{
                        description: 'Text Files',
                        accept: { 'text/plain': ['.txt'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                // Fallback to download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `app-log-${new Date().toISOString()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to save log file:', error);
        }
    }

    debug(message, error = null) {
        this.log('debug', message, error);
    }

    info(message, error = null) {
        this.log('info', message, error);
    }

    warn(message, error = null) {
        this.log('warn', message, error);
    }

    error(message, error = null) {
        this.log('error', message, error);
    }

    getHumanReadableErrors() {
        return this.logs
            .filter(log => log.level === 'error')
            .map(log => {
                const date = new Date(log.timestamp).toLocaleString();
                return `${date}: ${log.message}`;
            })
            .join('\n\n');
    }

    downloadLogs() {
        this.saveToFile();
    }
}

// Create singleton instance
export const logger = new Logger();
