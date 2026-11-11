/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

/**
 * Slovenské chybové hlášky, ktoré frontend zobrazuje používateľovi.
 */
vine.messagesProvider = new SimpleMessagesProvider(
  {
    'required': 'Pole {{ field }} je povinné',
    'string': 'Pole {{ field }} musí byť text',
    'email': 'Neplatný formát emailu',
    'minLength': 'Pole {{ field }} musí mať aspoň {{ min }} znakov',
    'maxLength': 'Pole {{ field }} môže mať najviac {{ max }} znakov',
    'sameAs': 'Heslá sa nezhodujú',
    'nickname.regex': 'Prezývka môže obsahovať iba písmená bez diakritiky, číslice a znaky _ . -',
    'nickname.database.unique': 'Používateľ s touto prezývkou už existuje',
    'email.database.unique': 'Používateľ s týmto emailom už existuje',
  },
  {
    name: 'meno',
    surname: 'priezvisko',
    nickname: 'prezývka',
    email: 'email',
    password: 'heslo',
    passwordConfirmation: 'potvrdenie hesla',
  }
)

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))
