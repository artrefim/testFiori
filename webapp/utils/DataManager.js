/**
 * Preparación de estructuras utilizadas por los servicios.
 */
sap.ui.define([], function () {
    "use strict";

    return {
        /*
         * Preparar la estructura requerida para crear el aviso.
         */
        getSendFaultStructure: function (oFault) {
            const aLongText = this.splitLongDescription(oFault.description)
                .map((sTextLine) => ({ TextLine: sTextLine }));

            return {
                Usuario: sap.ushell.Container.getService("UserInfo").getId() || "",
                TipoAveria: oFault.type || "",
                TituloAveria: oFault.shortFault || "",
                FechaInicio: "",
                UbTectnica: "",
                Equipo: oFault.equipmentSAP || "",
                CentroEquipo: oFault.center || "",
                isGolpeMalUso: oFault.IsGolpeMalUso === true,
                Resultado: "",
                MsgText: "",
                LONGTEXTSet: aLongText
            };
        },

        /*
         * Dividir la descripción en segmentos admitidos por el texto largo.
         */
        splitLongDescription: function (sDescription) {
            return String(sDescription || "").match(/.{1,132}/g) || [];
        }
    };
});