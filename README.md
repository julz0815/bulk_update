Veracode Bluk Updater
A little Javascript tool to bulk update users and profiles on the Veracode platfrom


Usage 

Usage: index.js --type <users|profiles> --actions <update|fetch> --file <input file | output file> --credentialsfile <credentials file>

  Options:

    -h, --help                            output usage information
    --type <users|profiles>               choose to work with users or profiles
    --actions <update|fetch>              select the action to perform, either update the users or profiles online or fetch the actual data from the Veracode platfomr
    --file <input file | output file>     provide a file name with your updates or where to store to fetched data
    --credentialsfile <credentials file>  provide a the path to your Veracode credentaidls file


Prerequisite
- node must be installed on the machine running the tool
- The API credentials to run this need the admin role applied 
- There must be one profile on the platform with all custom fields set to a value. This profile doesnt require to have scan and therefore doesn't use a license if you are on the per app licensing.


Fetch
Will download all user or profile data from the Veracode platform and stores all informatuon on a CSV file. The file parameter will hold the filename to store the information.


Update
The user data will hold the following data
"User ID","User Name","Firstname Lastname","E-Mail","SAML Username","Login Enabled","User is Active","Is SAML User","Roles","Teams","Team Admin","Team Admim Roles"
Not everything can or should be modified, as well some values on some colums will make some columns unmodifiedable.

Columns that cannot be modified
"User ID","SAML Username","Is SAML User"

Admin users and SAML users will automatically be excluded from the update process

Conditional modifieable columns
"User Name","Firstname Lastname","E-Mail" can only be modified if the "Is SAML User" column is set to "false"

The roles column can hold the following roles for human users that ar shown on the Veracode platform documentation here https://docs.veracode.com/r/c_identity_intro#roles

The roles column can hold the following roles for non-human API users that are shown on the Veracode platform documentation here https://docs.veracode.com/r/c_identity_intro#user-roles

For some roles, you must include one or more of these scan types that the user can submit, please refer to this documentation for more information https://docs.veracode.com/r/c_identity_intro#create-a-user-account

Team Admin Teams can only be updated if the Team Admin column is set to Yest.
The Team Admin teams can only hold any of the teams that the user is part of.


The profile data will hold the following data
"App GUID","App name","Business Unit","policy","Business Criticality","Teams","Custom 1","Custom 2","Custom 3","Custom 4","Custom 5","Custom 6","Custom 7","Custom 8","Custom 9","Custom 10"
The only column that can not be mofied is "App GUID".
The custom fields 1 to n will be dynamically fetched and named according to what they are named on the Veracode platform.
