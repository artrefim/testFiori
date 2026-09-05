sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "ZF_AV_AVERIAS/utils/Constants"
], function (Controller, History, MessageBox, MessageToast, Constants) {
    "use strict";

    return Controller.extend("ZF_AV_AVERIAS.controller.BaseController", {
        navBack: function () {
            const sPreviousHash = History.getInstance().getPreviousHash();

            if (sPreviousHash !== undefined) {
                history.go(-1);
            } else {
                this.getRouter().navTo(Constants.VIEWS.MAIN, {}, true);
            }
        },

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        navTo: function (sView) {
            this.getRouter().navTo(sView);
        },

        getRoute: function (sRoute) {
            return this.getRouter().getRoute(sRoute);
        },

        getText: function (...aArguments) {
            return this.getView()
                .getModel("i18n")
                .getResourceBundle()
                .getText(...aArguments);
        },

        /*
         * Extraer el mensaje más útil disponible de un error OData.
         */
        showErrorMessageService: function (oError) {
            let sMessage = "";

            try {
                const oResponse = JSON.parse(oError.responseText || "{}");
                const aErrorDetails = oResponse.error
                    && oResponse.error.innererror
                    && oResponse.error.innererror.errordetails;

                if (Array.isArray(aErrorDetails) && aErrorDetails.length > 0) {
                    sMessage = aErrorDetails[0].message || "";
                }

                if (!sMessage && oResponse.error && oResponse.error.message) {
                    sMessage = oResponse.error.message.value
                        || oResponse.error.message
                        || "";
                }

                if (!sMessage) {
                    sMessage = oResponse.message || "";
                }
            } catch (oParsingError) {
                sMessage = "";
            }

            sMessage = sMessage
                || oError.message
                || this.getText("main.action.sendFault.error.generic");

            this.showErrorMessage(sMessage);
        },

        showErrorMessageHeader: function (oError) {
            this.showErrorMessage(oError.message);
        },

        showErrorMessage: function (sMessage, fnOnClose) {
            MessageBox.error(sMessage, {
                onClose: fnOnClose
            });
        },

        showToastMessage: function (sMessage) {
            const oMessage = JSON.parse(sMessage);

            MessageToast.show(oMessage.message, {
                duration: 6000
            });
        },

        resetFaultData: function () {
            const sDefaultDescription = this.getText(
                "main.list.item.description.defaultValue"
            );
            const oNewFault = {
                shortFault: "",
                type: "",
                number: "",
                equipmentSAP: "",
                center: "",
                equipmentActive: false,
                equipmentDescription: "",
                equipmentDescriptionState: "None",
                equipmentSelectionRequired: false,
                description: sDefaultDescription,
                IsGolpeMalUso: false
            };

            this.getView()
                .getModel(Constants.MODELS.DATA)
                .setProperty("/newFault", oNewFault);
        }
    });
});