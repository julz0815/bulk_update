import program from 'commander-plus'
import chalk from 'chalk'
import { updateUsers } from './users/update_users'
import { fetchUsers } from './users/fetch_users'
import { fetchApps } from './profiles/fetch_apps'
import { updateApps } from './profiles/update_apps'

program
    .usage('--type <users|profiles> --actions <update|fetch> --file <input file | output file> --credentialsfile <credentials file>')
    .option('--type <users|profiles>', 'choose to work with users or profiles')
    .option('--actions <update|fetch>', 'select the action to perform, either update the users or profiles online or fetch the actual data from the Veracode platfomr')
    .option('--file <input file | output file>', 'provide a file name with your updates or where to store to fetched data')
    .option('--credentialsfile <credentials file>', 'provide a the path to your Veracode credentaidls file')
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
if (!program.credentialsfile) {
    printMissingArg('--credentialsfile <credentials file>')
    missingRequiredArg = true
}

if (missingRequiredArg) {
    program.help()
}

(async () => {

if ( program.type == 'users' ) {
    console.log(chalk.green('Working with users'))
    if ( program.actions == 'update' ) {
        console.log(chalk.green('Updating users'))
        const updateUsersRun = await updateUsers(program.file, program.credentialsfile)
    }
    else if ( program.actions == 'fetch' ) {
        console.log(chalk.green('Fetching users'))
        const fetchUsersRun = await fetchUsers(program.file, program.credentialsfile)
    }
    process.exit(1)
}

if ( program.type == 'profiles' ) {
    console.log(chalk.green('Working with profiles'))
    if ( program.actions == 'update' ) {
        console.log(chalk.green('Updating profiles'))
        const fetchAppsRun = await updateApps(program.file, program.credentialsfile)
    }
    else if ( program.actions == 'fetch' ) {
        console.log(chalk.green('Fetching profiles'))
        const fetchAppsRun = await fetchApps(program.file, program.credentialsfile)
    }
    process.exit(1)
}

})();