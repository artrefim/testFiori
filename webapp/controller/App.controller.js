sap.ui.define([
    "ZF_AV_AVERIAS/controller/BaseController",
    "ZF_AV_AVERIAS/utils/Constants",
    "ZF_AV_AVERIAS/utils/Services",
    "ZF_AV_AVERIAS/utils/UserContext",
    "sap/ui/core/BusyIndicator"
], function (
    Controller,
    Constants,
    Services,
    UserContext,
    BusyIndicator
) {
    "use strict";

    return Controller.extend("ZF_AV_AVERIAS.controller.App", {
        onInit: function () {
            sap.ui.getCore()
                .getEventBus()
                .subscribe(
                    "appZFAverias",
                    "init",
                    this.handleInitRequest,
                    this
                );
        },

        /*
         * Preparar los servicios y validar al usuario antes de iniciar el router.
         */
        handleInitRequest: function () {
            this.createModels();
            this.validateUserAndStart();
        },

        /*
         * Asignar el modelo OData utilizado por los servicios.
         */
        createModels: function () {
            const oODataModel = this.getOwnerComponent()
                .getModel(Constants.MODELS.AVISOS_AVERIAS);

            Services.setModel(oODataModel);
        },

        /*
         * Validar si el usuario puede acceder a la creación de avisos.
         */
        validateUserAndStart: function () {
            BusyIndicator.show(0);

            UserContext.initialize()
                .then((oUserContext) => {
                    if (!oUserContext.allowed) {
                        this.showValidationErrorAndStart(oUserContext.message);
                        return;
                    }

                    this.getRouter().initialize();
                })
                .catch((oUserContext) => {
                    const sMessage = oUserContext && oUserContext.message
                        ? oUserContext.message
                        : "";

                    this.showValidationErrorAndStart(sMessage);
                })
                .finally(() => {
                    BusyIndicator.hide();
                });
        },

        /*
         * Mostrar el error de validación e iniciar después la navegación.
         */
        showValidationErrorAndStart: function (sMessage) {
            const sErrorMessage = sMessage
                || this.getText("main.action.userValidation.error.generic");

            this.showErrorMessage(
                sErrorMessage,
                () => this.getRouter().initialize()
            );
        },

        onExit: function () {
            sap.ui.getCore()
                .getEventBus()
                .unsubscribe(
                    "appZFAverias",
                    "init",
                    this.handleInitRequest,
                    this
                );
        }
    });
});