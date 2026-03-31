// #####################################################################
// SWITCHES
// #####################################################################

app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('log-level', '3');

function netErrorCode(errorDescription) {

    switch (errorDescription) {
        case 'ERR_NAME_NOT_RESOLVED':
            errorMsg = 'ERR_NAME_NOT_RESOLVED';
            errorMsgExplain = 'The website address could not be found. Please check the URL and try again.';
            break;
        case 'ERR_INTERNET_DISCONNECTED':
            errorMsg = 'ERR_INTERNET_DISCONNECTED';
            errorMsgExplain = 'No internet connection. Please check your network settings and try again.';
            break;
        case 'ERR_CONNECTION_REFUSED':
            errorMsg = 'ERR_CONNECTION_REFUSED';
            errorMsgExplain = 'The server refused the connection. The website may be down or blocking requests.';
            break;
        case 'ERR_CONNECTION_TIMED_OUT':
            errorMsg = 'ERR_CONNECTION_TIMED_OUT';
            errorMsgExplain = 'The connection timed out. The website may be slow or unreachable.';
            break;
        case 'ERR_CONNECTION_CLOSED':
            errorMsg = 'ERR_CONNECTION_CLOSED';
            errorMsgExplain = 'The connection was closed unexpectedly. Please refresh the page.';
            break;
        case 'ERR_CONNECTION_RESET':
            errorMsg = 'ERR_CONNECTION_RESET';
            errorMsgExplain = 'The connection was reset. This may be due to network issues.';
            break;
        case 'ERR_CONNECTION_ABORTED':
            errorMsg = 'ERR_CONNECTION_ABORTED';
            errorMsgExplain = 'The connection was aborted. This may be due to network issues.';
            break;
        case 'ERR_CONNECTION_FAILED':
            errorMsg = 'ERR_CONNECTION_FAILED';
            errorMsgExplain = 'The connection failed. Please check your network and try again.';
            break;
        case 'ERR_NETWORK_CHANGED':
            errorMsg = 'ERR_NETWORK_CHANGED';
            errorMsgExplain = 'The network changed. Please refresh the page.';
            break;
        case 'ERR_TUNNEL_CONNECTION_FAILED':
            errorMsg = 'ERR_TUNNEL_CONNECTION_FAILED';
            errorMsgExplain = 'The tunnel connection failed. This may be due to network issues.';
            break;
        case 'ERR_SSL_PROTOCOL_ERROR':
            errorMsg = 'ERR_SSL_PROTOCOL_ERROR';
            errorMsgExplain = 'SSL protocol error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_BAD_CERT_DOMAIN':
            errorMsg = 'ERR_SSL_BAD_CERT_DOMAIN';
            errorMsgExplain = 'SSL certificate domain error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_PINNED_KEY_NOT_IN_CERT_CHAIN':
            errorMsg = 'ERR_SSL_PINNED_KEY_NOT_IN_CERT_CHAIN';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_WEAK_SERVER_CERT_KEY':
            errorMsg = 'ERR_SSL_WEAK_SERVER_CERT_KEY';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_WEAK_SERVER_EPHEMERAL_KEY':
            errorMsg = 'ERR_SSL_WEAK_SERVER_EPHEMERAL_KEY';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_SERVER_CERT_REVOKED':
            errorMsg = 'ERR_SSL_SERVER_CERT_REVOKED';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_DATE_INVALID':
            errorMsg = 'ERR_SSL_CERT_DATE_INVALID';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_VALIDITY_TOO_LONG':
            errorMsg = 'ERR_SSL_CERT_VALIDITY_TOO_LONG';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_REQUIRED':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_REQUIRED';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_NOT_FOUND':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_NOT_FOUND';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_REVOKED':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_REVOKED';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_NOT_YET_VALID':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_NOT_YET_VALID';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_TOO_MANY_LOGGERS':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_TOO_MANY_LOGGERS';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_NOT_FOUND':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_NOT_FOUND';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_NOT_YET_VALID':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_NOT_YET_VALID';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_REVOKED':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_REVOKED';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        default:
            errorMsg = 'UNKNOWN_ERROR';
            errorMsgExplain = 'An unknown error occurred. Please try again later.';
            break;
    }

    return {errorMsg, errorMsgExplain};
}