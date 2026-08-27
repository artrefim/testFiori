/**
 * Servicios OData de la aplicación.
 */
sap.ui.define([
    "ZF_AV_AVERIAS/utils/Constants",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Constants, Filter, FilterOperator) {
    "use strict";

    return {
        setModel: function (oModel) {
            this.oModel = oModel;
        },

        getModel: function () {
            return this.oModel;
        },

        /*
         * Recuperar los avisos creados por el usuario.
         */
        searchMyFaults: function () {
            return new Promise((resolve, reject) => {
                const oServiceInfo = {
                    success: (oData) => resolve(oData),
                    error: (oError) => reject(oError)
                };

                this.getModel().read(Constants.ENTITIES.MY_FAULTS, oServiceInfo);
            });
        },

        /*
         * Recuperar el contexto y las autorizaciones del usuario.
         */
        getUserContext: function () {
            return new Promise((resolve, reject) => {
                const oServiceInfo = {
                    success: (oData) => resolve(oData),
                    error: (oError) => reject(oError)
                };

                this.getModel().read(
                    `${Constants.ENTITIES.USER_CONTEXT}('CURRENT')`,
                    oServiceInfo
                );
            });
        },

        /*
         * Recuperar los equipos asociados al identificador introducido.
         */
        getEquipmentCandidates: function (sIdentifier) {
            return new Promise((resolve, reject) => {
                const aFilters = [
                    new Filter("IdentificadorEquipo", FilterOperator.EQ, sIdentifier)
                ];
                const oServiceInfo = {
                    filters: aFilters,
                    success: (oData) => resolve(oData.results || []),
                    error: (oError) => reject(oError)
                };

                this.getModel().read(
                    Constants.ENTITIES.EQUIPMENT,
                    oServiceInfo
                );
            });
        },

        /*
         * Crear el aviso con los datos preparados por DataManager.
         */
        sendFault: function (oParams) {
            return new Promise((resolve, reject) => {
                const oServiceInfo = {
                    success: (oData, oResponse) => resolve({ oData, oResponse }),
                    error: (oError) => reject(oError)
                };

                this.getModel().create(
                    Constants.ENTITIES.SEND_FAULT,
                    oParams,
                    oServiceInfo
                );
            });
        }
    };
}, true);