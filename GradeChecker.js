const axios = require('axios');
const cheerio = require('cheerio');
const player = require('play-sound')(opts = {});

// URL to the grades page
const url = 'https://selfservice.mun.ca/admit/bwskogrd.P_ViewGrde';

// First four digits - year, last two digits - semester
// 01 - Fall, 02 - Winter, 03 - Spring
// For example:
// '202401' is Fall 2024
// '202402' is Winter 2025
// '202403' is Spring 2025
// '202501' is Fall 2025
const term = '202402'; // Winter 2025

// Cookies to be used in the request
// These are the cookies that are set when you log in to the grades page
// You can get these by logging in to the grades page, opening the developer tools, going to the "Application" tab, and copying the below cookies from the Cookies section
let cookiesObject = {
    'TESTID': 'VALUE',
    'IDMSESSID': 'VALUE',
    'JSESSIONID': 'VALUE',
    'SESSID': 'VALUE',
    'utag_main': 'VALUE'
};

function cookieObjectToString(cookies) {
    return Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ');
}

async function updateCookiesFromResponse(response) {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
        setCookieHeaders.forEach(header => {
            const cookiePair = header.split(';')[0];
            const [key, value] = cookiePair.split('=');
            // Only update cookie if it has changed
            if(cookiesObject[key] !== value)
                cookiesObject[key] = value;
        });
    }
}

let checkGrades = setInterval(checkForTable, 5000);

async function checkForTable() {
    try {
        const response = await axios.post(url, `term_in=${term}`, {
            headers: {
                'Cookie': cookieObjectToString(cookiesObject)
            }
        });
        await updateCookiesFromResponse(response);
        const $ = cheerio.load(response.data);

        // Check if the grade table exists
        const tableExists = $('.datadisplaytable').length > 0;

        if (tableExists) {
            console.log('Grades are up!');
            // stop checking for grades
            clearInterval(checkGrades);
            playSoundLoop();
        } else {
            console.log('Grades not found. Checking again in 5 seconds...');
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

function playSoundLoop() {
    player.play('grades_are_up.mp3', function (err) {
        if (err) {
            console.log(`Could not play sound: ${err}`);
            return;
        }
        playSoundLoop(); // Recursively play sound again
    });
}

// shutdown gracefully
process.on('SIGTERM', function () {
    console.log('SIGTERM received, shutting down script...');
    process.exit(0);
});
