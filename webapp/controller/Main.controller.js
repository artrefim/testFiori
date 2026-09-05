sap.ui.define([
    "ZF_AV_AVERIAS/controller/BaseController",
    "ZF_AV_AVERIAS/utils/Constants",
    "ZF_AV_AVERIAS/utils/DataManager",
    "ZF_AV_AVERIAS/utils/Services",
    "ZF_AV_AVERIAS/utils/UserContext",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller,
    Constants,
    DataManager,
    Services,
    UserContext,
    BusyIndicator,
    Fragment,
    JSONModel,
    Filter,
    FilterOperator
) {
    "use strict";

    return Controller.extend("ZF_AV_AVERIAS.controller.Main", {
        onInit: function () {
            this._iEquipmentRequestId = 0;
            this._equipmentValidationTimer = null;

            this.getRouter()
                .getRoute(Constants.VIEWS.MAIN)
                .attachMatched(this.handleRouteMatched, this);

            const oDescriptionTextArea = this.byId("descriptionTextArea");

            if (oDescriptionTextArea) {
                oDescriptionTextArea.addEventDelegate({
                    onAfterRendering: function () {
                        const oDomRef = oDescriptionTextArea.getFocusDomRef();

                        if (oDomRef) {
                            oDomRef.classList.add("descriptionTextAreaAnimated");
                        }
                    },
                    onfocusin: function () {
                        this._resizeDescriptionTextArea(oDescriptionTextArea, 10);
                    }.bind(this),
                    onfocusout: function () {
                        this._resizeDescriptionTextArea(oDescriptionTextArea, 5);
                    }.bind(this)
                }, this);
            }
        },

        onExit: function () {
            if (this._pEquipmentSelectionDialog) {
                this._pEquipmentSelectionDialog.then((oDialog) => oDialog.destroy());
                this._pEquipmentSelectionDialog = null;
            }

            clearTimeout(this._equipmentValidationTimer);
            this._equipmentValidationTimer = null;
        },

        /*
         * Reiniciar el formulario y cualquier selección de equipo anterior.
         */
        handleRouteMatched: function () {
            this._iEquipmentRequestId++;
            this.resetFaultData();
            this._setEquipmentCandidates([]);
        },

        onMyFaultsPress: function () {
            this.navTo(Constants.VIEWS.MY_FAULTS);
        },

        onAboutPress: function () {
            this.navTo(Constants.VIEWS.ABOUT);
        },

        /*
 * Invalidar la resolución anterior mientras se modifica el identificador.
 * El campo deja de mostrarse en rojo desde la primera modificación.
 *
 * Resolver el nuevo identificador cuando han transcurrido 500 ms
 * desde la última modificación.
 */
        onEquipmentLiveChange: function (oEvent) {
            const sIdentifier = String(
                oEvent.getParameter("value") || ""
            ).trim();

            /*
             * Cancelar la validación programada para el valor anterior.
             */
            clearTimeout(this._equipmentValidationTimer);
            this._equipmentValidationTimer = null;

            /*
             * Limpiar inmediatamente la resolución anterior.
             */
            this._clearEquipmentResolution();

            /*
             * Si el campo está vacío, no programar ninguna resolución.
             */
            if (!sIdentifier) {
                return;
            }

            /*
             * Resolver únicamente si el usuario permanece 700 ms
             * sin modificar de nuevo el identificador.
             */
            this._equipmentValidationTimer = setTimeout(function () {
                this._equipmentValidationTimer = null;

                this._resolveEquipmentIdentifier(sIdentifier);
            }.bind(this), 700);
        },

        // /*
        //  * Invalidar la resolución anterior mientras se modifica el identificador.
        //  * El campo deja de mostrarse en rojo desde la primera modificación.
        //  */
        // onEquipmentLiveChange: function () {
        //     this._clearEquipmentResolution();
        // },

        // /*
        //  * Resolver el identificador cuando el usuario abandona el campo.
        //  */
        // onEquipmentChange: function () {
        //     const oModel = this.getView().getModel(Constants.MODELS.DATA);
        //     const sIdentifier = String(oModel.getProperty("/newFault/number") || "").trim();

        //     if (!sIdentifier) {
        //         this._clearEquipmentResolution();
        //         return;
        //     }

        //     this._resolveEquipmentIdentifier(sIdentifier);
        // },

        /*
         * Recuperar los posibles equipos asociados al identificador.
         */
        _resolveEquipmentIdentifier: function (sIdentifier) {
            const iRequestId = ++this._iEquipmentRequestId;

            Services.getEquipmentCandidates(sIdentifier)
                .then((aCandidates) => {
                    if (iRequestId !== this._iEquipmentRequestId) {
                        return;
                    }

                    const aReceivedCandidates = Array.isArray(aCandidates) ? aCandidates : [];

                    if (aReceivedCandidates.length === 0) {
                        this._setEquipmentCandidates([]);
                        this._setEquipmentError(this.getText("main.equipment.notFound"));
                        return;
                    }

                    /*
                     * Un candidato solo puede utilizarse si contiene equipo SAP y centro.
                     */
                    const aValidCandidates = aReceivedCandidates.filter((oCandidate) => {
                        const sEquipmentSAP = String(oCandidate.EquipoSAP || "").trim();
                        const sCenter = String(oCandidate.Centro || "").trim();

                        return Boolean(sEquipmentSAP && sCenter);
                    });

                    if (aValidCandidates.length === 0) {
                        this._setEquipmentCandidates([]);
                        this._setEquipmentError(this.getText("main.equipment.withoutCenter"));
                        return;
                    }

                    this._setEquipmentCandidates(aValidCandidates);

                    /*
                     * Aplicar directamente un único resultado o solicitar selección.
                     */
                    if (aValidCandidates.length === 1) {
                        this._applyEquipment(aValidCandidates[0]);
                        return;
                    }

                    this._markEquipmentSelectionRequired();
                    this._openEquipmentSelectionDialog();
                })
                .catch((oError) => {
                    if (iRequestId !== this._iEquipmentRequestId) {
                        return;
                    }

                    this._clearEquipmentResolution();
                    this.showErrorMessageService(oError);
                });
        },
        /*
         * Mantener en un único modelo los candidatos disponibles.
         */
        _setEquipmentCandidates: function (aCandidates) {
            let oCandidatesModel = this.getView().getModel("equipmentCandidates");

            if (!oCandidatesModel) {
                oCandidatesModel = new JSONModel({
                    items: [],
                    selectedCandidate: null
                });

                this.getView().setModel(oCandidatesModel, "equipmentCandidates");
            }

            const aFormattedCandidates = (aCandidates || []).map((oCandidate) => ({
                ...oCandidate,
                EquipmentInformation: [
                    oCandidate.EquipoSAP,
                    oCandidate.Centro,
                    oCandidate.NombreCentro
                ]
                    .map((sValue) => String(sValue || "").trim())
                    .filter(Boolean)
                    .join("  ·  ")
            }));

            oCandidatesModel.setProperty("/items", aFormattedCandidates);
            oCandidatesModel.setProperty("/selectedCandidate", null);
        },

        /*
         * Indicar que el identificador corresponde a varios equipos.
         */
        _markEquipmentSelectionRequired: function () {
            const oModel = this.getView().getModel(Constants.MODELS.DATA);
            const oEquipmentInput = this.byId("equipmentInput");

            oModel.setProperty("/newFault/equipmentSAP", "");
            oModel.setProperty("/newFault/center", "");
            oModel.setProperty("/newFault/equipmentActive", false);
            oModel.setProperty("/newFault/equipmentDescription", "");
            oModel.setProperty("/newFault/equipmentDescriptionState", "None");
            oModel.setProperty("/newFault/equipmentSelectionRequired", true);

            if (oEquipmentInput) {
                oEquipmentInput.setValueState("None");
                oEquipmentInput.setValueStateText("");
            }
        },

        /*
        * Aplicar el candidato seleccionado y conservar el centro internamente.
        */
        _applyEquipment: function (oCandidate) {
            const oModel = this.getView().getModel(Constants.MODELS.DATA);
            const oEquipmentInput = this.byId("equipmentInput");
            const sIdentifier = String(
                oCandidate.IdentificadorEquipo || ""
            ).trim();
            const sEquipmentSAP = String(
                oCandidate.EquipoSAP || ""
            ).trim();
            const sCenter = String(
                oCandidate.Centro || ""
            ).trim();
            const sCenterName = String(
                oCandidate.NombreCentro || ""
            ).trim();
            const sDescription = String(
                oCandidate.DescripcionEquipo || ""
            ).trim();
            const sFunctionalLocation = String(
                oCandidate.UbicacionTecnica || ""
            ).trim();
            const sFunctionalLocationDescription = String(
                oCandidate.DescripcionUbicacionTecnica || ""
            ).trim();
            const bEquipmentActive = oCandidate.IsActivo === true;

            /*
             * Componer el centro en formato:
             * 2220, Astillero Fene-Ferrol
             */
            const sCenterInformation = [
                sCenter,
                sCenterName
            ]
                .filter(Boolean)
                .join(", ");

            /*
             * Añadir la ubicación técnica únicamente cuando el equipo
             * está montado y dispone de una denominación.
             */
            const aEquipmentInformation = [
                sDescription
            ];

            if (sFunctionalLocation && sFunctionalLocationDescription) {
                aEquipmentInformation.push(
                    sFunctionalLocationDescription
                );
            }

            /*
             * El centro se muestra siempre entre paréntesis.
             */
            if (sCenterInformation) {
                const iLastPosition = aEquipmentInformation.length - 1;

                aEquipmentInformation[iLastPosition] =
                    `${aEquipmentInformation[iLastPosition]} (${sCenterInformation})`;
            }

            const sEquipmentInformation = aEquipmentInformation
                .map((sValue) => String(sValue || "").trim())
                .filter(Boolean)
                .join(" · ");

            if (sIdentifier) {
                oModel.setProperty(
                    "/newFault/number",
                    sIdentifier
                );
            }

            oModel.setProperty(
                "/newFault/equipmentSAP",
                sEquipmentSAP
            );

            oModel.setProperty(
                "/newFault/center",
                sCenter
            );

            oModel.setProperty(
                "/newFault/functionalLocation",
                sFunctionalLocation
            );

            oModel.setProperty(
                "/newFault/functionalLocationDescription",
                sFunctionalLocationDescription
            );

            oModel.setProperty(
                "/newFault/equipmentActive",
                bEquipmentActive
            );

            oModel.setProperty(
                "/newFault/equipmentDescription",
                sEquipmentInformation
            );

            oModel.setProperty(
                "/newFault/equipmentDescriptionState",
                bEquipmentActive ? "Success" : "Error"
            );

            oModel.setProperty(
                "/newFault/equipmentSelectionRequired",
                false
            );

            if (oEquipmentInput) {
                oEquipmentInput.setValueState(
                    bEquipmentActive ? "None" : "Error"
                );

                oEquipmentInput.setValueStateText(
                    bEquipmentActive
                        ? ""
                        : this.getText("main.equipment.inactive")
                );
            }

            oModel.checkUpdate(true);
        },

        /*
         * Cargar y abrir el diálogo de selección de equipo.
         */
        _openEquipmentSelectionDialog: function () {
            if (!this._pEquipmentSelectionDialog) {
                this._pEquipmentSelectionDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "ZF_AV_AVERIAS.view.fragments.EquipmentSelection",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pEquipmentSelectionDialog.then((oDialog) => {
                const oList = this.byId("equipmentSelectionList");
                const oSearchField = this.byId("equipmentSelectionSearch");
                const oBeginButton = oDialog.getBeginButton();

                if (oList) {
                    oList.removeSelections(true);

                    const oBinding = oList.getBinding("items");

                    if (oBinding) {
                        oBinding.filter([]);
                    }
                }

                if (oSearchField) {
                    oSearchField.setValue("");
                }

                if (oBeginButton) {
                    oBeginButton.setEnabled(false);
                }

                oDialog.open();
            });
        },

        /*
         * Reabrir el diálogo con los candidatos conservados.
         */
        onEquipmentSelectionLinkPress: function () {
            const oCandidatesModel = this.getView().getModel("equipmentCandidates");
            const aCandidates = oCandidatesModel
                ? oCandidatesModel.getProperty("/items") || []
                : [];

            if (aCandidates.length > 0) {
                this._openEquipmentSelectionDialog();
            }
        },

        /*
         * Guardar temporalmente el candidato marcado en la lista.
         */
        onEquipmentSelectionChange: function (oEvent) {
            const oListItem = oEvent.getParameter("listItem");
            const oDialog = this.byId("equipmentSelectionDialog");
            const oCandidatesModel = this.getView().getModel("equipmentCandidates");

            if (!oListItem || !oDialog || !oCandidatesModel) {
                return;
            }

            const oBindingContext = oListItem.getBindingContext("equipmentCandidates");

            if (!oBindingContext) {
                return;
            }

            oCandidatesModel.setProperty(
                "/selectedCandidate",
                oBindingContext.getObject()
            );

            const oBeginButton = oDialog.getBeginButton();

            if (oBeginButton) {
                oBeginButton.setEnabled(true);
            }
        },

        /*
         * Aplicar el candidato confirmado y cerrar el diálogo.
         */
        onEquipmentSelectionConfirm: function () {
            const oDialog = this.byId("equipmentSelectionDialog");
            const oCandidatesModel = this.getView().getModel("equipmentCandidates");
            const oCandidate = oCandidatesModel
                ? oCandidatesModel.getProperty("/selectedCandidate")
                : null;

            if (!oDialog || !oCandidate) {
                return;
            }

            this._applyEquipment(oCandidate);
            oDialog.close();
        },

        /*
         * Cerrar el diálogo conservando el enlace para volver a abrirlo.
         */
        onEquipmentSelectionCancel: function () {
            const oDialog = this.byId("equipmentSelectionDialog");

            if (oDialog) {
                oDialog.close();
            }
        },

        /*
         * Filtrar por equipo SAP, descripción o centro.
         */
        onEquipmentSelectionSearch: function (oEvent) {
            const sQuery = String(oEvent.getParameter("newValue") || "").trim();
            const oList = this.byId("equipmentSelectionList");
            const oBinding = oList ? oList.getBinding("items") : null;

            if (!oBinding) {
                return;
            }

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            const oFilter = new Filter({
                filters: [
                    new Filter("EquipoSAP", FilterOperator.Contains, sQuery),
                    new Filter("DescripcionEquipo", FilterOperator.Contains, sQuery),
                    new Filter("Centro", FilterOperator.Contains, sQuery),
                    new Filter("NombreCentro", FilterOperator.Contains, sQuery)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
        },

        /*
         * Limpiar el estado temporal del diálogo después de cerrarlo.
         */
        onEquipmentSelectionAfterClose: function () {
            const oList = this.byId("equipmentSelectionList");
            const oCandidatesModel = this.getView().getModel("equipmentCandidates");

            if (oList) {
                oList.removeSelections(true);
            }

            if (oCandidatesModel) {
                oCandidatesModel.setProperty("/selectedCandidate", null);
            }
        },

        /*
         * Extraer el identificador del contenido leído y resolverlo.
         */
        onScanSuccess: function (oEvent) {
            const sScannedText = String(oEvent.getParameter("text") || "").trim();
            const sIdentifier = String(sScannedText.split(/\s+/)[0] || "").trim();
            const oModel = this.getView().getModel(Constants.MODELS.DATA);

            this._clearEquipmentResolution();
            oModel.setProperty("/newFault/number", sIdentifier);

            if (sIdentifier) {
                this._resolveEquipmentIdentifier(sIdentifier);
            }
        },

        onCopicScanSuccess: function (oEvent) {
            const sScannedText = String(oEvent.getParameter("text") || "").trim();

            this.getView()
                .getModel(Constants.MODELS.DATA)
                .setProperty("/newFault/copic", sScannedText);
        },

        onScanError: function (oEvent) {
            this.showErrorMessageService(oEvent);
        },

        // /*
        //  * Validar autorización y campos obligatorios antes del envío.
        //  */
        // onSendPress: function () {
        //     if (!UserContext.isAllowed()) {
        //         const sMessage = UserContext.getErrorMessage()
        //             || this.getText("main.action.userValidation.error.generic");

        //         this.showErrorMessage(sMessage);
        //         return;
        //     }

        //     if (!this.checkMandatoryFields()) {
        //         this.showErrorMessage(
        //             this.getText("main.action.sendFault.mandatoryFields.msg")
        //         );
        //         return;
        //     }

        //     this.sendFault();
        // },

        /*
 * Validar autorización y campos obligatorios antes del envío.
 */
        onSendPress: function () {
            if (!UserContext.isAllowed()) {
                const sMessage = UserContext.getErrorMessage() ||
                    this.getText("main.action.userValidation.error.generic");

                this.showErrorMessage(sMessage);
                return;
            }

            const bMandatoryFieldsValid = this.checkMandatoryFields();

            if (!bMandatoryFieldsValid) {
                const oModel = this.getView().getModel(
                    Constants.MODELS.DATA
                );
                const oFault = oModel.getProperty("/newFault") || {};
                const sEquipmentSAP = String(
                    oFault.equipmentSAP || ""
                ).trim();
                const sEquipmentIdentifier = String(
                    oFault.number || ""
                ).trim();
                const bEquipmentResolved = Boolean(
                    sEquipmentSAP
                    && String(oFault.center || "").trim()
                    && !oFault.equipmentSelectionRequired
                );
                const bEquipmentInactive = Boolean(
                    bEquipmentResolved
                    && oFault.equipmentActive === false
                );

                if (bEquipmentInactive) {
                    const sEquipmentReference = sEquipmentIdentifier
                        && sEquipmentIdentifier !== sEquipmentSAP
                        ? `${sEquipmentSAP} (${sEquipmentIdentifier})`
                        : sEquipmentSAP || sEquipmentIdentifier;

                    this.showErrorMessage(
                        this.getText(
                            "main.action.sendFault.equipmentInactive",
                            [sEquipmentReference]
                        )
                    );

                    return;
                }

                this.showErrorMessage(
                    this.getText(
                        "main.action.sendFault.mandatoryFields.msg"
                    )
                );

                return;
            }

            this.sendFault();
        },

        /*
         * Validar campos visibles y exigir un equipo SAP resuelto.
         */
        checkMandatoryFields: function () {
            const oModel = this.getView().getModel(Constants.MODELS.DATA);
            const oFault = oModel.getProperty("/newFault") || {};
            const bShortFaultValid = Boolean(String(oFault.shortFault || "").trim());
            const bTypeValid = Boolean(String(oFault.type || "").trim());
            const bEquipmentNumberValid = Boolean(String(oFault.number || "").trim());
            const bEquipmentResolved = Boolean(
                String(oFault.equipmentSAP || "").trim()
                && String(oFault.center || "").trim()
                && !oFault.equipmentSelectionRequired
            );
            const bEquipmentActive = oFault.equipmentActive === true;
            const bEquipmentValid = Boolean(
                bEquipmentNumberValid
                && bEquipmentResolved
                && bEquipmentActive
            );
            const bDescriptionValid = this._hasUserDescription(oFault.description);


            let sEquipmentValidationMessage;

            if (!bEquipmentNumberValid) {
                sEquipmentValidationMessage = this.getText(
                    "main.validation.equipment.required"
                );
            } else if (bEquipmentResolved && !bEquipmentActive) {
                sEquipmentValidationMessage = this.getText(
                    "main.equipment.inactive"
                );
            } else {
                sEquipmentValidationMessage = this.getText(
                    "main.validation.equipment.invalid"
                );
            }

            this._setMandatoryFieldState(
                "shortFaultInput",
                bShortFaultValid,
                this.getText("main.validation.shortFault.required")
            );

            this._setMandatoryFieldState(
                "faultTypeSelect",
                bTypeValid,
                this.getText("main.validation.type.required")
            );

            this._setMandatoryFieldState(
                "equipmentInput",
                bEquipmentValid,
                sEquipmentValidationMessage
            );

            this._setMandatoryFieldState(
                "descriptionTextArea",
                bDescriptionValid,
                this.getText("main.validation.description.required")
            );

            return bShortFaultValid
                && bTypeValid
                && bEquipmentValid
                && bDescriptionValid;
        },

        /*
         * Quitar el error cuando el usuario empieza a corregir un campo.
         */
        clearFieldError: function (oEvent) {
            const oControl = oEvent.getSource();

            oControl.setValueState("None");
            oControl.setValueStateText("");
        },

        /*
         * Invalidar una resolución anterior sin mostrar un error nuevo.
         */
        _clearEquipmentResolution: function () {
            this._iEquipmentRequestId++;
            this._clearResolvedEquipment();

            const oEquipmentInput = this.byId("equipmentInput");

            if (oEquipmentInput) {
                oEquipmentInput.setValueState("None");
                oEquipmentInput.setValueStateText("");
            }
        },

        /*
         * Borrar los datos internos obtenidos al resolver el equipo.
         */
        _clearResolvedEquipment: function () {
            const oModel = this.getView().getModel(Constants.MODELS.DATA);

            oModel.setProperty("/newFault/equipmentSAP", "");
            oModel.setProperty("/newFault/center", "");
            oModel.setProperty("/newFault/equipmentActive", false);
            oModel.setProperty("/newFault/equipmentDescription", "");
            oModel.setProperty("/newFault/equipmentDescriptionState", "None");
            oModel.setProperty("/newFault/equipmentSelectionRequired", false);
        },

        /*
         * Mostrar un error funcional asociado al identificador del equipo.
         */
        _setEquipmentError: function (sMessage) {
            const oModel = this.getView().getModel(Constants.MODELS.DATA);
            const oEquipmentInput = this.byId("equipmentInput");
            const sErrorMessage = sMessage
                || this.getText("main.equipment.genericError");

            this._clearResolvedEquipment();

            oModel.setProperty("/newFault/equipmentDescription", sErrorMessage);
            oModel.setProperty("/newFault/equipmentDescriptionState", "Error");

            if (oEquipmentInput) {
                oEquipmentInput.setValueState("Error");
                oEquipmentInput.setValueStateText(sErrorMessage);
            }

            oModel.checkUpdate(true);
        },

        /*
         * Crear el aviso y procesar el mensaje devuelto por Gateway.
         */
        sendFault: function () {
            const oFault = this.getView()
                .getModel(Constants.MODELS.DATA)
                .getProperty("/newFault");
            const oParams = DataManager.getSendFaultStructure(oFault);

            BusyIndicator.show(0);

            Services.sendFault(oParams)
                .then((oDataInfo) => {
                    const sMessage = oDataInfo.oResponse
                        && oDataInfo.oResponse.headers
                        ? oDataInfo.oResponse.headers["sap-message"]
                        : "";

                    if (!sMessage) {
                        return;
                    }

                    const oMessage = JSON.parse(sMessage);

                    if (oMessage.code === Constants.ERRORS.SEND_ERROR) {
                        this.showErrorMessageHeader(oMessage);
                        return;
                    }

                    this.showToastMessage(sMessage);
                    this.resetFaultData();
                    this._setEquipmentCandidates([]);
                })
                .catch((oError) => {
                    this.showErrorMessageService(oError);
                })
                .finally(() => {
                    BusyIndicator.hide();
                });
        },

        /*
         * Ajustar suavemente la altura del texto descriptivo.
         */
        _resizeDescriptionTextArea: function (oTextArea, iRows) {
            const oDomRef = oTextArea.getFocusDomRef();

            if (!oDomRef) {
                return;
            }

            const iCurrentHeight = oDomRef.offsetHeight;

            oDomRef.style.height = "auto";
            oDomRef.setAttribute("rows", iRows.toString());

            const iTargetHeight = oDomRef.scrollHeight;

            oDomRef.style.height = `${iCurrentHeight}px`;

            // Forzar al navegador a registrar la altura inicial.
            void oDomRef.offsetHeight;

            oDomRef.style.height = `${iTargetHeight}px`;
        },

        /*
         * Comprobar que la descripción contiene información distinta de la plantilla.
         */
        _hasUserDescription: function (sDescription) {
            const sTemplate = this.getText(
                "main.list.item.description.defaultValue"
            );
            const fnNormalize = function (sValue) {
                return String(sValue || "")
                    .replace(/\r\n/g, "\n")
                    .replace(/\r/g, "\n")
                    .trim();
            };
            const sNormalizedDescription = fnNormalize(sDescription);
            const sNormalizedTemplate = fnNormalize(sTemplate);

            return Boolean(
                sNormalizedDescription
                && sNormalizedDescription !== sNormalizedTemplate
            );
        },

        /*
         * Aplicar de forma común el estado de validación a un control.
         */
        _setMandatoryFieldState: function (sControlId, bIsValid, sErrorText) {
            const oControl = this.byId(sControlId);

            if (!oControl) {
                return;
            }

            oControl.setValueState(bIsValid ? "None" : "Error");
            oControl.setValueStateText(bIsValid ? "" : sErrorText);
        }
    });
});