const isLocalFrontend = ["localhost", "127.0.0.1"].includes(window.location.hostname);

window.HYMEDIA_CONFIG = {
  API_BASE_URL: isLocalFrontend
    ? "http://localhost:5000"
    : "https://hymedia-api-b00968573-ajegdnfpa9braqet.italynorth-01.azurewebsites.net"
};
