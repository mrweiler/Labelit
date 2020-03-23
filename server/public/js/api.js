const BASE_URL = window.location.origin

const sendData = async (endpoint, type, data) => {
  const url = BASE_URL + endpoint
  const options = {
    method: type,
    headers: {
      Accept: 'application/json',
      Authorization: 'test',
      'Content-Type': 'application/json;charset=UTF-8'
    },
    body: JSON.stringify(data)
  }
  const response = await fetch(url, options)
  return true
}

const getData = async endpoint => {
  const url = BASE_URL + endpoint
  const options = {
    method: 'GET',
    headers: {
      Authorization: 'test'
    }
  }

  const response = await fetch(url, options)
  return response.json()
}
