sap.ui.define([
    "ZF_AV_AVERIAS/controller/BaseController",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel"
], function (BaseController, History, JSONModel) {
    "use strict";

    return BaseController.extend("ZF_AV_AVERIAS.controller.About", {

        onInit: function () {
            this.getRouter()
                .getRoute("About")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._setApplicationInformation();
        },

        _setApplicationInformation: function () {
            const oSapApp = this.getOwnerComponent()
                .getManifestEntry("sap.app");

            const sVersion = oSapApp &&
                oSapApp.applicationVersion &&
                oSapApp.applicationVersion.version
                ? oSapApp.applicationVersion.version
                : "";

            const oAboutModel = new JSONModel({
                version: sVersion,
                imageSrc: sap.ui.require.toUrl(
                    "ZF_AV_AVERIAS/img/about-app.png"
                )
            });

            this.getView().setModel(oAboutModel, "about");
        },

        /**
         * Devuelve el ResourceBundle del modelo i18n.
         *
         * No se utiliza this.getResourceBundle() porque ese método
         * no está definido actualmente en BaseController.
         *
         * @returns {sap.base.i18n.ResourceBundle} ResourceBundle
         * @private
         */
        _getResourceBundle: function () {
            return this.getOwnerComponent()
                .getModel("i18n")
                .getResourceBundle();
        },

        onNavBack: function () {
            const sPreviousHash = History
                .getInstance()
                .getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
                return;
            }

            this.getRouter().navTo("Main", {}, true);
        },

        formatChangeText: function (sTextKey) {
            if (!sTextKey) {
                return "";
            }

            return this._getResourceBundle().getText(sTextKey);
        },

        formatVersionTitle: function (sVersion) {
            if (!sVersion) {
                return "";
            }

            return this._getResourceBundle().getText(
                "about.version.title",
                [sVersion]
            );
        },

        formatVersionDate: function (sDate) {
            if (!sDate) {
                return "";
            }

            return this._getResourceBundle().getText(
                "about.version.published",
                [sDate]
            );
        }

    });
});