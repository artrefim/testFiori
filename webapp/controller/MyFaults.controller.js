sap.ui.define([
	"ZF_AV_AVERIAS/controller/BaseController",
	"ZF_AV_AVERIAS/utils/Constants",
	"ZF_AV_AVERIAS/utils/Services",
	"sap/ui/generic/app/navigation/service/NavigationHandler",
], function (Controller, Constants, Services, NavigationHandler) {
	"use strict";

	return Controller.extend("ZF_AV_AVERIAS.controller.MyFaults", {

		onInit: function () {
			this.getRoute(Constants.VIEWS.MY_FAULTS).attachPatternMatched(this.onRouteMatched, this);
			this.oNavigationHandler = new NavigationHandler(this);

			// const oViewModel = new JSONModel({
			// 	filtersVisible: false,
			// 	resultCount: 0
			// });

			// this.getView().setModel(oViewModel, "myFaultsView");
		},

		onRouteMatched: function () {
			this.callMyFaultsService();
		},

		callMyFaultsService: function () {
			sap.ui.core.BusyIndicator.show(0);
			Services.searchMyFaults().then((oData) => {
				this.getView().getModel(Constants.MODELS.DATA).setProperty("/MyFaultsList", oData.results);
			}).catch((oError) => {
				this.showErrorMessageService(oError);
			}).finally(() => {
				sap.ui.core.BusyIndicator.hide();
			});
		},

		onIcnPressSearchFault: function (oEvent) {
			let sDescription = oEvent.getParameters().query;

			let oFilterQmnum = new sap.ui.model.Filter(Constants.FILTERS.QMNUM,
				sap.ui.model.FilterOperator.Contains,
				sDescription);
			let oFilterQmtxt = new sap.ui.model.Filter(Constants.FILTERS.QMTXT,
				sap.ui.model.FilterOperator.Contains,
				sDescription);
			let oFilterEstat = new sap.ui.model.Filter(Constants.FILTERS.ESTAT,
				sap.ui.model.FilterOperator.Contains,
				sDescription);
			let oFilter = new sap.ui.model.Filter({
				filters: [oFilterQmnum, oFilterQmtxt, oFilterEstat],
				and: false
			});

			let oList = this.getView().byId(Constants.IDS.MY_FAULTS_LIST);
			oList.getBinding("items").filter(oFilter, sap.ui.model.FilterType.Application);
		},

		onItmPressMyFaultsList: function (oEvent) {
			let oSelectedFault = oEvent.getSource().getBindingContext(Constants.MODELS.DATA).getObject();
			this.oNavigationHandler.navigate("MaintenanceNotification", "display", {
				"QMNUM": oSelectedFault.Qmnum
			});
		}
	});
});