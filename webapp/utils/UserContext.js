sap.ui.define([
    "ZF_AV_AVERIAS/utils/Services"
], function(Services) {
    "use strict";

    const DEFAULT_ERROR_MESSAGE =
        "No ha sido posible validar si el usuario puede crear avisos de avería.";

    let oContext = {
        validated: false,  // informa si la consulta inicial ya terminó.
        allowed: false,    // informa si backend autoriza la creación de avisos
        message: ""        // motivo del rechazo o un error técnico
    };

    function normalizeResult(oData) {
        return {
            validated: true,
            allowed: oData.Allowed === true,
            message: oData.Message || ""
        };
    }

    function getTechnicalErrorMessage(oError) {
        let sMessage = "";

        try {
            const oResponse = JSON.parse(
                oError.responseText
            );

            if (
                oResponse.error &&
                oResponse.error.innererror &&
                oResponse.error.innererror.errordetails &&
                oResponse.error.innererror
                    .errordetails.length > 0
            ) {
                sMessage =
                    oResponse.error.innererror
                        .errordetails[0].message;
            } else if (
                oResponse.error &&
                oResponse.error.message
            ) {
                sMessage =
                    oResponse.error.message.value ||
                    oResponse.error.message;
            } else if (oResponse.message) {
                sMessage = oResponse.message;
            }
        } catch (oParsingError) {
            // La respuesta técnica no contiene JSON válido
        }

        return (
            sMessage ||
            oError.message ||
            oError.statusText ||
            DEFAULT_ERROR_MESSAGE
        );
    }

    return {

        initialize: function() {
            return Services.getUserContext()
                .then(function(oData) {
                    oContext = normalizeResult(oData);

                    return oContext;
                })
                .catch(function(oError) {
                    oContext = {
                        validated: true,
                        allowed: false,
                        message:
                            getTechnicalErrorMessage(
                                oError
                            )
                    };

                    return Promise.reject(oContext);
                });
        },

        isValidated: function() {
            return oContext.validated;
        },

        isAllowed: function() {
            return (
                oContext.validated &&
                oContext.allowed
            );
        },

        getErrorMessage: function() {
            return (
                oContext.message ||
                DEFAULT_ERROR_MESSAGE
            );
        }
    };
});