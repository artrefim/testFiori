/**
 * Constantes generales de la aplicación.
 */
sap.ui.define("ZF_AV_AVERIAS.utils.Constants", [], function () {
    "use strict";

    return {
        VIEWS: {
            MAIN: "Main",
            MY_FAULTS: "MyFaults",
            ABOUT: "About"
        },

        MODELS: {
            I18N: "i18n",
            AVISOS_AVERIAS: "ZGW_PM_AVISOS_AVERIAS_SRV",
            DATA_TYPES: "dataTypesModel",
            DATA: "dataModel"
        },

        IDS: {
            MY_FAULTS_LIST: "MyFaultsList"
        },

        ENTITIES: {
            MY_FAULTS: "/AVISOS_USUARIOSet",
            SEND_FAULT: "/PORTAL_AVISOSSet",
            USER_CONTEXT: "/USER_CONTEXTSet",
            EQUIPMENT: "/EQUIPMENTSet"
        },

        FILTERS: {
            QMNUM: "Qmnum",
            QMTXT: "Qmtxt",
            ESTAT: "Estat"
        },

        ERRORS: {
            SEND_ERROR: "01/000"
        }
    };
}, true);