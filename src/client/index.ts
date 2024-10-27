
import { Config, LoadJsonFile, Locale } from '@common/.';
import type { Character } from '../common/typings';
import { hideTextUI } from '@overextended/ox_lib/client';
import { SendTypedNUIMessage, serverNuiCallback } from 'utils';
import { getLocales, locale } from '@overextended/ox_lib/shared';
import { OxAccountPermissions, OxAccountRole } from '@overextended/ox_core';
import { cache, getLocales, hideTextUI, requestAnimDict, sleep, waitFor } from '@overextended/ox_lib/client';
import type { Character } from '../common/typings';
import { SendTypedNUIMessage, serverNuiCallback } from './utils';
import {initLocale} from '@overextended/ox_lib/shared'
import { OxAccountPermissions, OxAccountRoles } from '@overextended/ox_core';
import { Vector3 } from '@nativewrappers/client';


const usingTarget = GetConvarInt('ox_banking:target', 0) === 1;
let hasLoadedUi = false;
let isUiOpen = false;
let isATMopen = false;

function canOpenUi() {
  return IsPedOnFoot(cache.ped);
}

function setupUi() {
  initLocale()

  if (hasLoadedUi) return;

  const accountRoles: OxAccountRole[] = GlobalState.accountRoles;
  const permissions = accountRoles.reduce(
    (acc, role) => {
      acc[role] = GlobalState[`accountRole.${role}`] as OxAccountPermissions;
      return acc;
    },
    {} as Record<OxAccountRole, OxAccountPermissions>
  );

  SendNUIMessage({
    action: 'setInitData',
    data: {
      locales: getLocales(),
      permissions,
    },
  });

  hasLoadedUi = true;
}

const openAtm = async ({ entity }: { entity: number }) => {
  if (!canOpenUi) return;

  const atmEnter = await requestAnimDict('mini@atmenter');
  const [x, y, z] = GetOffsetFromEntityInWorldCoords(entity, 0, -0.7, 1);
  const heading = GetEntityHeading(entity);
  const sequence = OpenSequenceTask(0) as unknown as number;

  TaskGoStraightToCoord(0, x, y, z, 1.0, 5000, heading, 0.25);
  TaskPlayAnim(0, atmEnter, 'enter', 4.0, -2.0, 1600, 0, 0.0, false, false, false);
  CloseSequenceTask(sequence);
  TaskPerformSequence(cache.ped, sequence);
  ClearSequenceTask(sequence);
  setupUi();

  await sleep(0);
  await waitFor(() => GetSequenceProgress(cache.ped) === -1 || undefined, '', false);

  PlaySoundFrontend(-1, 'PIN_BUTTON', 'ATM_SOUNDS', true);

  isUiOpen = true;
  isATMopen = true;

  SendTypedNUIMessage('openATM', null);
  SetNuiFocus(true, true);
  RemoveAnimDict(atmEnter);
};

exports('openAtm', openAtm);

const openBank = () => {
  if (!canOpenUi) return;

  setupUi();

  const playerCash: number = exports.ox_inventory.GetItemCount('money');
  isUiOpen = true;

  hideTextUI();

  SendTypedNUIMessage<Character>('openBank', { cash: playerCash });
  SetNuiFocus(true, true);
};

exports('openBank', openBank);
AddTextEntry('ox_banking_bank', Locale('bank'));

const createBankBlip = ([x, y, z]: number[]) => {
  const { sprite, colour, scale } = Config.BankBlip;

  if (!sprite) return;

  const blip = AddBlipForCoord(x, y, z);
  SetBlipSprite(blip, sprite);
  SetBlipColour(blip, colour);
  SetBlipScale(blip, scale);
  SetBlipAsShortRange(blip, true);
  BeginTextCommandSetBlipName('ox_banking_bank');
  EndTextCommandSetBlipName(blip);
};

const banks = LoadJsonFile<typeof import('~/data/banks.json')>('data/banks.json');

if (Config.UseOxTarget) {
  exports.sleepless_interact.addGlobalModel({
    models: [
      {model: "prop_fleeca_atm", offset: new Vector3(0, 0, 1.0)},
      {model: "prop_atm_01", offset: new Vector3(0, 0, 1.0)},
      {model: "prop_atm_02", offset: new Vector3(0, 0, 1.0)},
      {model: "prop_atm_03", offset: new Vector3(0, 0, 1.0)},
    ],
      id: 'access_atm',
      options: [
        {
          icon: 'fa-solid fa-money-check',
          label: locale('access_atm'),
          onSelect: (id: string | number, entity?: number, coords: Vector3, distance: number) => {
            openAtm({ entity });
          },
        },
        {
          icon: 'fa-solid fa-sack-dollar',
          label: locale('rob_atm'),
          onSelect: (id: string | number, entity?: number, coords: Vector3, distance: number) => {
            openAtm({ entity });
          },
        },
      ],
      renderDistance: 2.0,
      activeDistance: 1.0,
    }
  );

  const bankOptions = {
    name: 'access_bank',
    icon: 'fa-solid fa-dollar-sign',
    label: Locale('target_access_bank'),
    onSelect: openBank,
    distance: 1.3,
  };
  
  exports.sleepless_interact.addCoords({
    id: 'access_bank',
    coords: [
      new Vector3(149.7474, -1041.4419, 29.7),
      new Vector3(421.4, 567.8, 125.0),
      new Vector3(314.0676, -279.6146, 54.43),
      new Vector3(-351.0613, -50.4046, 49.30),
      new Vector3(-1212.3430, -331.1905, 38.05),
      new Vector3(248.485, 223.2904, 106.4085),
      new Vector3(-2962.0, 482.9439, 15.9852),
      new Vector3(1174.9997, 2707.3660, 38.4),
      new Vector3(-111.7381, 6469.452, 31.9485),
    ],
    // size: target.size,
    // rotation: target.rotation,
    // debug: true,
    renderDistance: 5.0,
    activeDistance: 1.3,
    options: [
      {
        icon: 'fa-solid fa-dollar-sign',
        label: locale('access_bank'),
        onSelect: (id: string | number, entity?: number, coords: Vector3, distance: number) => {
          openBank();
        },
      },
    ],
  });
}

RegisterNuiCallback('exit', async (_: any, cb: Function) => {
  cb(1);
  SetNuiFocus(false, false);

  isUiOpen = false;
  isATMopen = false;
});

on('ox_inventory:itemCount', (itemName: string, count: number) => {
  if (!isUiOpen || isATMopen || itemName !== 'money') return;

  SendTypedNUIMessage<Character>('refreshCharacter', { cash: count });
});

serverNuiCallback('getDashboardData');
serverNuiCallback('transferOwnership');
serverNuiCallback('manageUser');
serverNuiCallback('removeUser');
serverNuiCallback('getAccountUsers');
serverNuiCallback('addUserToAccount');
serverNuiCallback('getAccounts');
serverNuiCallback('createAccount');
serverNuiCallback('deleteAccount');
serverNuiCallback('depositMoney');
serverNuiCallback('withdrawMoney');
serverNuiCallback('transferMoney');
serverNuiCallback('renameAccount');
serverNuiCallback('convertAccountToShared');
serverNuiCallback('getLogs');
serverNuiCallback('getInvoices');
serverNuiCallback('payInvoice');
