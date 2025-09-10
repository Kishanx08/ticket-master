// Timezone detection and parsing utilities
const moment = require('moment-timezone');

class TimezoneUtils {
    constructor() {
        // Common timezone mappings based on Discord locale
        this.localeToTimezone = {
            'en-US': 'America/New_York',
            'en-GB': 'Europe/London',
            'en-AU': 'Australia/Sydney',
            'en-CA': 'America/Toronto',
            'en-NZ': 'Pacific/Auckland',
            'de-DE': 'Europe/Berlin',
            'fr-FR': 'Europe/Paris',
            'es-ES': 'Europe/Madrid',
            'it-IT': 'Europe/Rome',
            'pt-BR': 'America/Sao_Paulo',
            'ja-JP': 'Asia/Tokyo',
            'ko-KR': 'Asia/Seoul',
            'zh-CN': 'Asia/Shanghai',
            'zh-TW': 'Asia/Taipei',
            'ru-RU': 'Europe/Moscow',
            'pl-PL': 'Europe/Warsaw',
            'nl-NL': 'Europe/Amsterdam',
            'sv-SE': 'Europe/Stockholm',
            'no-NO': 'Europe/Oslo',
            'da-DK': 'Europe/Copenhagen',
            'fi-FI': 'Europe/Helsinki',
            'tr-TR': 'Europe/Istanbul',
            'ar-SA': 'Asia/Riyadh',
            'hi-IN': 'Asia/Kolkata',
            'th-TH': 'Asia/Bangkok',
            'vi-VN': 'Asia/Ho_Chi_Minh',
            'id-ID': 'Asia/Jakarta',
            'ms-MY': 'Asia/Kuala_Lumpur',
            'tl-PH': 'Asia/Manila',
            'uk-UA': 'Europe/Kiev',
            'cs-CZ': 'Europe/Prague',
            'hu-HU': 'Europe/Budapest',
            'ro-RO': 'Europe/Bucharest',
            'bg-BG': 'Europe/Sofia',
            'hr-HR': 'Europe/Zagreb',
            'sk-SK': 'Europe/Bratislava',
            'sl-SI': 'Europe/Ljubljana',
            'et-EE': 'Europe/Tallinn',
            'lv-LV': 'Europe/Riga',
            'lt-LT': 'Europe/Vilnius',
            'el-GR': 'Europe/Athens',
            'he-IL': 'Asia/Jerusalem',
            'fa-IR': 'Asia/Tehran',
            'ur-PK': 'Asia/Karachi',
            'bn-BD': 'Asia/Dhaka',
            'si-LK': 'Asia/Colombo',
            'ne-NP': 'Asia/Kathmandu',
            'my-MM': 'Asia/Yangon',
            'km-KH': 'Asia/Phnom_Penh',
            'lo-LA': 'Asia/Vientiane',
            'ka-GE': 'Asia/Tbilisi',
            'hy-AM': 'Asia/Yerevan',
            'az-AZ': 'Asia/Baku',
            'kk-KZ': 'Asia/Almaty',
            'ky-KG': 'Asia/Bishkek',
            'uz-UZ': 'Asia/Tashkent',
            'tg-TJ': 'Asia/Dushanbe',
            'mn-MN': 'Asia/Ulaanbaatar',
            'bo-CN': 'Asia/Urumqi',
            'dz-BT': 'Asia/Thimphu',
            'ml-IN': 'Asia/Kolkata',
            'ta-IN': 'Asia/Kolkata',
            'te-IN': 'Asia/Kolkata',
            'kn-IN': 'Asia/Kolkata',
            'gu-IN': 'Asia/Kolkata',
            'pa-IN': 'Asia/Kolkata',
            'or-IN': 'Asia/Kolkata',
            'as-IN': 'Asia/Kolkata',
            'mr-IN': 'Asia/Kolkata',
            'bn-IN': 'Asia/Kolkata',
            'ur-IN': 'Asia/Kolkata',
            'hi-IN': 'Asia/Kolkata',
            'en-IN': 'Asia/Kolkata'
        };
    }

    // Detect timezone from Discord user locale
    detectTimezoneFromLocale(locale) {
        if (!locale) return 'UTC';
        
        // Check if locale is in our mapping
        if (this.localeToTimezone[locale]) {
            return this.localeToTimezone[locale];
        }

        // Try to extract country code and map to common timezones
        const countryCode = locale.split('-')[1];
        if (countryCode) {
            const countryTimezones = {
                'US': 'America/New_York',
                'GB': 'Europe/London',
                'CA': 'America/Toronto',
                'AU': 'Australia/Sydney',
                'DE': 'Europe/Berlin',
                'FR': 'Europe/Paris',
                'ES': 'Europe/Madrid',
                'IT': 'Europe/Rome',
                'BR': 'America/Sao_Paulo',
                'JP': 'Asia/Tokyo',
                'KR': 'Asia/Seoul',
                'CN': 'Asia/Shanghai',
                'TW': 'Asia/Taipei',
                'RU': 'Europe/Moscow',
                'IN': 'Asia/Kolkata',
                'TH': 'Asia/Bangkok',
                'ID': 'Asia/Jakarta',
                'MY': 'Asia/Kuala_Lumpur',
                'PH': 'Asia/Manila',
                'SG': 'Asia/Singapore',
                'HK': 'Asia/Hong_Kong',
                'NZ': 'Pacific/Auckland',
                'MX': 'America/Mexico_City',
                'AR': 'America/Argentina/Buenos_Aires',
                'CL': 'America/Santiago',
                'CO': 'America/Bogota',
                'PE': 'America/Lima',
                'VE': 'America/Caracas',
                'ZA': 'Africa/Johannesburg',
                'EG': 'Africa/Cairo',
                'NG': 'Africa/Lagos',
                'KE': 'Africa/Nairobi',
                'MA': 'Africa/Casablanca',
                'TN': 'Africa/Tunis',
                'DZ': 'Africa/Algiers',
                'LY': 'Africa/Tripoli',
                'SD': 'Africa/Khartoum',
                'ET': 'Africa/Addis_Ababa',
                'GH': 'Africa/Accra',
                'UG': 'Africa/Kampala',
                'TZ': 'Africa/Dar_es_Salaam',
                'ZW': 'Africa/Harare',
                'ZM': 'Africa/Lusaka',
                'BW': 'Africa/Gaborone',
                'NA': 'Africa/Windhoek',
                'SZ': 'Africa/Mbabane',
                'LS': 'Africa/Maseru',
                'MG': 'Indian/Antananarivo',
                'MU': 'Indian/Mauritius',
                'SC': 'Indian/Mahe',
                'MV': 'Indian/Maldives',
                'RE': 'Indian/Reunion',
                'YT': 'Indian/Mayotte',
                'KM': 'Indian/Comoro',
                'DJ': 'Africa/Djibouti',
                'SO': 'Africa/Mogadishu',
                'ER': 'Africa/Asmara',
                'SS': 'Africa/Juba',
                'CF': 'Africa/Bangui',
                'TD': 'Africa/Ndjamena',
                'NE': 'Africa/Niamey',
                'BF': 'Africa/Ouagadougou',
                'ML': 'Africa/Bamako',
                'SN': 'Africa/Dakar',
                'GM': 'Africa/Banjul',
                'GN': 'Africa/Conakry',
                'SL': 'Africa/Freetown',
                'LR': 'Africa/Monrovia',
                'CI': 'Africa/Abidjan',
                'GH': 'Africa/Accra',
                'TG': 'Africa/Lome',
                'BJ': 'Africa/Porto-Novo',
                'NG': 'Africa/Lagos',
                'CM': 'Africa/Douala',
                'GQ': 'Africa/Malabo',
                'GA': 'Africa/Libreville',
                'ST': 'Africa/Sao_Tome',
                'AO': 'Africa/Luanda',
                'CD': 'Africa/Kinshasa',
                'CG': 'Africa/Brazzaville',
                'CF': 'Africa/Bangui',
                'TD': 'Africa/Ndjamena',
                'SD': 'Africa/Khartoum',
                'SS': 'Africa/Juba',
                'ET': 'Africa/Addis_Ababa',
                'ER': 'Africa/Asmara',
                'DJ': 'Africa/Djibouti',
                'SO': 'Africa/Mogadishu',
                'KE': 'Africa/Nairobi',
                'UG': 'Africa/Kampala',
                'TZ': 'Africa/Dar_es_Salaam',
                'RW': 'Africa/Kigali',
                'BI': 'Africa/Bujumbura',
                'MW': 'Africa/Blantyre',
                'ZM': 'Africa/Lusaka',
                'ZW': 'Africa/Harare',
                'BW': 'Africa/Gaborone',
                'NA': 'Africa/Windhoek',
                'SZ': 'Africa/Mbabane',
                'LS': 'Africa/Maseru',
                'ZA': 'Africa/Johannesburg',
                'MG': 'Indian/Antananarivo',
                'MU': 'Indian/Mauritius',
                'SC': 'Indian/Mahe',
                'MV': 'Indian/Maldives',
                'RE': 'Indian/Reunion',
                'YT': 'Indian/Mayotte',
                'KM': 'Indian/Comoro'
            };

            if (countryTimezones[countryCode]) {
                return countryTimezones[countryCode];
            }
        }

        // Default to UTC if we can't determine
        return 'UTC';
    }

    // Parse time string with timezone support
    parseTimeString(timeString, timezone = 'UTC') {
        if (!timeString) return null;

        const now = moment().tz(timezone);
        const lowerTimeString = timeString.toLowerCase().trim();

        // Handle relative times
        if (lowerTimeString.includes('in ')) {
            const relativeTime = lowerTimeString.replace('in ', '');
            return this.parseRelativeTime(relativeTime, now);
        }

        // Handle "at" times (e.g., "at 3pm", "at 15:30")
        if (lowerTimeString.startsWith('at ')) {
            const timePart = lowerTimeString.replace('at ', '');
            return this.parseAtTime(timePart, now);
        }

        // Handle "tomorrow" and "today"
        if (lowerTimeString.includes('tomorrow')) {
            const tomorrow = now.clone().add(1, 'day');
            if (lowerTimeString.includes('at ')) {
                const timePart = lowerTimeString.replace('tomorrow at ', '').replace('tomorrow ', '');
                return this.parseAtTime(timePart, tomorrow);
            }
            return tomorrow.startOf('day').toDate();
        }

        if (lowerTimeString.includes('today')) {
            if (lowerTimeString.includes('at ')) {
                const timePart = lowerTimeString.replace('today at ', '').replace('today ', '');
                return this.parseAtTime(timePart, now);
            }
            return now.startOf('day').toDate();
        }

        // Handle specific dates
        if (lowerTimeString.includes('next ')) {
            return this.parseNextTime(lowerTimeString, now);
        }

        // Handle ISO dates
        if (lowerTimeString.match(/^\d{4}-\d{2}-\d{2}/)) {
            return moment.tz(timeString, timezone).toDate();
        }

        // Handle common date formats
        const dateFormats = [
            'MM/DD/YYYY HH:mm',
            'DD/MM/YYYY HH:mm',
            'YYYY-MM-DD HH:mm',
            'MM-DD-YYYY HH:mm',
            'DD-MM-YYYY HH:mm',
            'MM/DD/YYYY',
            'DD/MM/YYYY',
            'YYYY-MM-DD',
            'MM-DD-YYYY',
            'DD-MM-YYYY'
        ];

        for (const format of dateFormats) {
            const parsed = moment.tz(timeString, format, timezone);
            if (parsed.isValid()) {
                return parsed.toDate();
            }
        }

        // Try to parse as relative time
        return this.parseRelativeTime(timeString, now);
    }

    parseRelativeTime(timeString, baseTime) {
        const lowerTimeString = timeString.toLowerCase().trim();
        
        // Minutes
        if (lowerTimeString.endsWith('m') || lowerTimeString.endsWith('min') || lowerTimeString.endsWith('minute') || lowerTimeString.endsWith('minutes')) {
            const minutes = parseInt(lowerTimeString.replace(/[^\d]/g, ''));
            if (!isNaN(minutes)) {
                return baseTime.clone().add(minutes, 'minutes').toDate();
            }
        }

        // Hours
        if (lowerTimeString.endsWith('h') || lowerTimeString.endsWith('hr') || lowerTimeString.endsWith('hour') || lowerTimeString.endsWith('hours')) {
            const hours = parseInt(lowerTimeString.replace(/[^\d]/g, ''));
            if (!isNaN(hours)) {
                return baseTime.clone().add(hours, 'hours').toDate();
            }
        }

        // Days
        if (lowerTimeString.endsWith('d') || lowerTimeString.endsWith('day') || lowerTimeString.endsWith('days')) {
            const days = parseInt(lowerTimeString.replace(/[^\d]/g, ''));
            if (!isNaN(days)) {
                return baseTime.clone().add(days, 'days').toDate();
            }
        }

        // Weeks
        if (lowerTimeString.endsWith('w') || lowerTimeString.endsWith('week') || lowerTimeString.endsWith('weeks')) {
            const weeks = parseInt(lowerTimeString.replace(/[^\d]/g, ''));
            if (!isNaN(weeks)) {
                return baseTime.clone().add(weeks, 'weeks').toDate();
            }
        }

        // Months
        if (lowerTimeString.endsWith('mo') || lowerTimeString.endsWith('month') || lowerTimeString.endsWith('months')) {
            const months = parseInt(lowerTimeString.replace(/[^\d]/g, ''));
            if (!isNaN(months)) {
                return baseTime.clone().add(months, 'months').toDate();
            }
        }

        // Years
        if (lowerTimeString.endsWith('y') || lowerTimeString.endsWith('year') || lowerTimeString.endsWith('years')) {
            const years = parseInt(lowerTimeString.replace(/[^\d]/g, ''));
            if (!isNaN(years)) {
                return baseTime.clone().add(years, 'years').toDate();
            }
        }

        return null;
    }

    parseAtTime(timeString, baseTime) {
        const lowerTimeString = timeString.toLowerCase().trim();
        
        // Handle 12-hour format (3pm, 3:30pm, 3 PM, etc.)
        const pmMatch = lowerTimeString.match(/(\d{1,2})(?::(\d{2}))?\s*pm/i);
        if (pmMatch) {
            let hours = parseInt(pmMatch[1]);
            const minutes = pmMatch[2] ? parseInt(pmMatch[2]) : 0;
            
            if (hours !== 12) hours += 12;
            
            return baseTime.clone().hour(hours).minute(minutes).second(0).millisecond(0).toDate();
        }

        const amMatch = lowerTimeString.match(/(\d{1,2})(?::(\d{2}))?\s*am/i);
        if (amMatch) {
            let hours = parseInt(amMatch[1]);
            const minutes = amMatch[2] ? parseInt(amMatch[2]) : 0;
            
            if (hours === 12) hours = 0;
            
            return baseTime.clone().hour(hours).minute(minutes).second(0).millisecond(0).toDate();
        }

        // Handle 24-hour format (15:30, 15, etc.)
        const timeMatch = lowerTimeString.match(/(\d{1,2})(?::(\d{2}))?/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                return baseTime.clone().hour(hours).minute(minutes).second(0).millisecond(0).toDate();
            }
        }

        return null;
    }

    parseNextTime(timeString, baseTime) {
        const lowerTimeString = timeString.toLowerCase().trim();
        
        // Handle "next monday", "next tuesday", etc.
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < weekdays.length; i++) {
            if (lowerTimeString.includes(weekdays[i])) {
                const targetDay = i;
                const currentDay = baseTime.day();
                let daysUntilTarget = (targetDay - currentDay + 7) % 7;
                
                if (daysUntilTarget === 0) {
                    daysUntilTarget = 7; // Next week
                }
                
                return baseTime.clone().add(daysUntilTarget, 'days').startOf('day').toDate();
            }
        }

        return null;
    }

    // Format time for display
    formatTime(date, timezone = 'UTC') {
        return moment.tz(date, timezone).format('YYYY-MM-DD HH:mm:ss z');
    }

    // Get user-friendly timezone name
    getTimezoneName(timezone) {
        const timezoneNames = {
            'UTC': 'UTC',
            'America/New_York': 'Eastern Time',
            'America/Chicago': 'Central Time',
            'America/Denver': 'Mountain Time',
            'America/Los_Angeles': 'Pacific Time',
            'Europe/London': 'GMT/BST',
            'Europe/Paris': 'CET/CEST',
            'Europe/Berlin': 'CET/CEST',
            'Asia/Tokyo': 'JST',
            'Asia/Shanghai': 'CST',
            'Asia/Kolkata': 'IST',
            'Australia/Sydney': 'AEST/AEDT',
            'Pacific/Auckland': 'NZST/NZDT'
        };

        return timezoneNames[timezone] || timezone;
    }

    // Validate timezone
    isValidTimezone(timezone) {
        return moment.tz.zone(timezone) !== null;
    }
}

module.exports = new TimezoneUtils();
