targetScope = 'subscription'

@minLength(1)
@maxLength(64)
param environmentName string

@minLength(1)
param location string

param storageAccountName string = ''

resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: {
    'azd-env-name': environmentName
  }
}

module storage './storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    location: location
    storageAccountName: !empty(storageAccountName) ? storageAccountName : 'st${uniqueString(rg.id)}'
  }
}

output AZURE_STORAGE_ACCOUNT_NAME string = storage.outputs.name
output AZURE_STORAGE_ACCOUNT_KEY string = storage.outputs.key
output AZURE_STORAGE_CONNECTION_STRING string = storage.outputs.connectionString
