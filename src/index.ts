import program from 'commander-plus'
import chalk from 'chalk'
import { updateUsers } from './users/update_users'
import { fetchUsers } from './users/fetch_users'
import { fetchApps } from './profiles/fetch_apps'
import { updateApps } from './profiles/update_apps'

program
    .usage('--type <users|profiles> --actions <update|fetch> --file <input file | output file> --apiID <cAPI ID> --apiKey <API Key>')
    .option('--type <users|profiles>', 'choose to work with users or profiles')
    .option('--actions <update|fetch>', 'select the action to perform, either update the users or profiles online or fetch the actual data from the Veracode platfomr')
    .option('--file <input file | output file>', 'provide a file name with your updates or where to store to fetched data')
    .option('--apiID <Veracode API ID>', 'provide the Veracode API ID')
    .option('--apiKey <Veracode API KEY>', 'provide the Veracode API KEY')
    //.option('--credentialsfile <credentials file>', 'provide a the path to your Veracode credentaidls file')
    .parse(process.argv)

let missingRequiredArg = false
const printMissingArg = (details: string) => console.error(chalk.red('Missing argument:'), details)

if (!program.type) {
    printMissingArg('--type <users|profiles>')
    missingRequiredArg = true
}
if (!program.actions) {
    printMissingArg('--actions <update|fetch>')
    missingRequiredArg = true
}
if (!program.file) {
    printMissingArg('--file <input file | output file>')
    missingRequiredArg = true
}
if (!program.apiID) {
    printMissingArg('--apiID <Veracode API ID>')
    missingRequiredArg = true
}
if (!program.apiKey) {
    printMissingArg('--apiKey <Veracode API Key>')
    missingRequiredArg = true
}
/*a
if (!program.credentialsfile) {
    printMissingArg('--credentialsfile <credentials file>')
    missingRequiredArg = true
}
*/

if (missingRequiredArg) {
    program.help()
}

(async () => {

if ( program.type == 'users' ) {
    console.log(chalk.green('Working with users'))
    if ( program.actions == 'update' ) {
        console.log(chalk.green('Updating users'))
        console.log(chalk.green('API ID: '+program.apiID))
        console.log(chalk.green('API Key: '+program.apiKey))
        const updateUsersRun = await updateUsers(program.file, program.apID, program.apiKey)
    }
    else if ( program.actions == 'fetch' ) {
        console.log(chalk.green('Fetching users'))
        const fetchUsersRun = await fetchUsers(program.file, program.apiID, program.apiKey)
    }
    process.exit(0)
}

if ( program.type == 'profiles' ) {
    console.log(chalk.green('Working with profiles'))
    if ( program.actions == 'update' ) {
        console.log(chalk.green('Updating profiles'))
        const fetchAppsRun = await updateApps(program.file, program.apiID, program.apiKey)
    }
    else if ( program.actions == 'fetch' ) {
        console.log(chalk.green('Fetching profiles'))
        const fetchAppsRun = await fetchApps(program.file, program.apiID, program.apiKey)
    }
    process.exit(0)
}

})();