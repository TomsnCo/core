/* This file is part of Jeedom.
 *
 * Jeedom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Jeedom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Jeedom. If not, see <http://www.gnu.org/licenses/>.
 */

"use strict"

if (!jeeFrontEnd.backup) {
  jeeFrontEnd.backup = {
    init: function() {
      window.jeeP = this
    },
    postInit: function() {
      this.updateListBackup()
      for (var i in jeephp2js.repoList) {
        this.updateRepoListBackup(jeephp2js.repoList[i])
      }

      $.showLoading()
      jeedom.config.load({
        configuration: document.getElementById('backup').getJeeValues('.configKey')[0],
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function(data) {
          document.getElementById('backup').setJeeValues(data, '.configKey')
          jeeFrontEnd.modifyWithoutSave = false
        }
      })
    },
    getJeedomLog: function(_autoUpdate, _log) {
      $.ajax({
        type: 'POST',
        url: 'core/ajax/log.ajax.php',
        data: {
          action: 'get',
          log: _log,
        },
        dataType: 'json',
        global: false,
        error: function(request, status, error) {
          setTimeout(function() {
            jeeFrontEnd.backup.getJeedomLog(_autoUpdate, _log)
          }, 1000)
        },
        success: function(data) {
          if (data.state != 'ok') {
            setTimeout(function() {
              jeeFrontEnd.backup.getJeedomLog(_autoUpdate, _log)
            }, 1000)
            return
          }
          var log = ''
          if ($.isArray(data.result)) {
            for (var i in data.result.reverse()) {
              log += data.result[i] + "\n"
              if (data.result[i].indexOf('[END ' + _log.toUpperCase() + ' SUCCESS]') != -1) {
                $.fn.showAlert({
                  message: '{{L\'opération est réussie}}',
                  level: 'success'
                })
                if (_log == 'restore') {
                  jeedom.user.refresh()
                }
                $('.bt_restoreRepoBackup .fa-sync').hide()
                _autoUpdate = 0
              }
              if (data.result[i].indexOf('[END ' + _log.toUpperCase() + ' ERROR]') != -1) {
                $.fn.showAlert({
                  message: '{{L\'opération a échoué}}',
                  level: 'danger'
                })
                if (_log == 'restore') {
                  jeedom.user.refresh()
                }
                $('.bt_restoreRepoBackup .fa-sync').hide()
                _autoUpdate = 0
              }
            }
          }
          $('#pre_backupInfo').text(log)
          if (init(_autoUpdate, 0) == 1) {
            setTimeout(function() {
              jeeFrontEnd.backup.getJeedomLog(_autoUpdate, _log)
            }, 1000);
          } else {
            $('#bt_' + _log + 'Jeedom .fa-sync').hide()
            $('.bt_' + _log + 'Jeedom .fa-sync').hide()
            jeeFrontEnd.backup.updateListBackup();
            for (var i in jeephp2js.repoList) {
              jeeFrontEnd.backup.updateRepoListBackup(jeephp2js.repoList[i])
            }
          }
        }
      })
    },
    updateListBackup: function() {
      jeedom.backup.list({
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function(data) {
          var options = ''
          for (var i in data) {
            options += '<option value="' + i + '">' + data[i] + '</option>'
          }
          $('#sel_restoreBackup').html(options)
        }
      })
    },
    updateRepoListBackup: function(_repo) {
      jeedom.repo.backupList({
        repo: _repo,
        global: false,
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function(data) {
          var options = ''
          for (var i in data) {
            options += '<option value="' + data[i] + '">' + data[i] + '</option>'
          }
          $('.sel_restoreCloudBackup[data-repo=' + _repo + ']').empty().html(options)
        }
      })
    },
  }
}

jeeFrontEnd.backup.init()

document.onkeydown = function(event) {
  if (jeedomUtils.getOpenedModal()) return
  if ((event.ctrlKey || event.metaKey) && event.which == 83) { //s
    event.preventDefault()
    $("#bt_saveBackup").click()
  }
}

$(function() {
  jeeFrontEnd.backup.postInit()
})

$("#bt_saveBackup").on('click', function(event) {
  $.hideAlert()
  jeedom.config.save({
    configuration: document.getElementById('backup').getJeeValues('.configKey')[0],
    error: function(error) {
      $.fn.showAlert({
        message: error.message,
        level: 'danger'
      })
    },
    success: function() {
      jeedom.config.load({
        configuration: document.getElementById('backup').getJeeValues('.configKey')[0],
        plugin: 'core',
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function(data) {
          document.getElementById('backup').setJeeValues(data, '.configKey')
          jeeFrontEnd.modifyWithoutSave = false
          $.fn.showAlert({
            message: '{{Sauvegarde réussie}}',
            level: 'success'
          })
        }
      })
    }
  })
})

$(".bt_backupJeedom").on('click', function(event) {
  var el = $(this)
  bootbox.confirm('{{Êtes-vous sûr de vouloir faire une sauvegarde de}} ' + JEEDOM_PRODUCT_NAME + ' {{? Une fois lancée cette opération ne peut être annulée}}', function(result) {
    if (result) {
      $.hideAlert()
      el.find('.fa-sync').show()
      jeedom.backup.backup({
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function() {
          jeeFrontEnd.backup.getJeedomLog(1, 'backup')
        }
      })
    }
  })
})

$("#bt_restoreJeedom").on('click', function(event) {
  var el = $(this)
  bootbox.confirm('{{Êtes-vous sûr de vouloir restaurer}} ' + JEEDOM_PRODUCT_NAME + ' {{avec la sauvegarde}} <b>' + $('#sel_restoreBackup option:selected').text() + '</b> ? {{Une fois lancée cette opération ne peut être annulée.}} <span style="color:red;font-weight: bold;">{{IMPORTANT la restauration d\'un backup est une opération risquée et n\'est à utiliser qu\'en dernier recours}}.</span>', function(result) {
    if (result) {
      $.hideAlert()
      el.find('.fa-sync').show()
      jeedom.backup.restoreLocal({
        backup: document.getElementById('sel_restoreBackup').value,
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function() {
          jeeFrontEnd.backup.getJeedomLog(1, 'restore')
        }
      })
    }
  })
})

$("#bt_removeBackup").on('click', function(event) {
  var el = $(this)
  bootbox.confirm('{{Êtes-vous sûr de vouloir supprimer la sauvegarde}} <b>' + $('#sel_restoreBackup option:selected').text() + '</b> ?', function(result) {
    if (result) {
      el.find('.fa-sync').show()
      jeedom.backup.remove({
        backup: document.getElementById('sel_restoreBackup').value,
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function() {
          jeeFrontEnd.backup.updateListBackup()
          $.fn.showAlert({
            message: '{{Sauvegarde supprimée avec succès}}',
            level: 'success'
          })
        }
      })
    }
  })
})

$('#bt_downloadBackup').on('click', function() {
  window.open('core/php/downloadFile.php?pathfile=' + document.getElementById('sel_restoreBackup').value, "_blank", null)
})

$('#bt_uploadBackup').fileupload({
  dataType: 'json',
  replaceFileInput: false,
  done: function(e, data) {
    if (data.result.state != 'ok') {
      $.fn.showAlert({
        message: data.result.result,
        level: 'danger'
      })
      return
    }
    jeeFrontEnd.backup.updateListBackup()
    $.fn.showAlert({
      message: '{{Fichier(s) ajouté(s) avec succès}}',
      level: 'success'
    })
  }
})

$(".bt_uploadCloudBackup").on('click', function(event) {
  var el = $(this)
  bootbox.confirm('{{Êtes-vous sûr de vouloir envoyer une sauvegarde de}} ' + JEEDOM_PRODUCT_NAME + ' {{sur le cloud ? Une fois lancée cette opération ne peut être annulée}}', function(result) {
    if (result) {
      el.find('.fa-sync').show()
      jeedom.backup.uploadCloud({
        backup: document.getElementById('sel_restoreBackup').value,
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function() {
          jeeFrontEnd.backup.getJeedomLog(1, 'backupCloud')
        }
      })
    }
  })
})

$(".bt_restoreRepoBackup").on('click', function(event) {
  var el = this
  bootbox.confirm('{{Êtes-vous sûr de vouloir rapatrier la sauvegarde cloud}} <b>' + $('#sel_restoreCloudBackup option:selected').text() + '</b> ?', function(result) {
    if (result) {
      el.querySelector('.fa-sync').seen()
      jeedom.backup.restoreCloud({
        backup: el.closest('.repo').querySelector('.sel_restoreCloudBackup').value,
        repo: el.getAttribute('data-repo'),
        error: function(error) {
          $.fn.showAlert({
            message: error.message,
            level: 'danger'
          })
        },
        success: function() {
          jeeFrontEnd.backup.updateListBackup()
          $.fn.showAlert({
            message: '{{Sauvegarde rapatrier avec succès}}',
            level: 'success'
          })
        }
      })
    }
  })
})

$('#div_pageContainer').off('change', '.configKey').on('change', '.configKey:visible', function() {
  jeeFrontEnd.modifyWithoutSave = true
})

$(".btn_closeInfo").on('click', function() {
  $('.panel-backupinfo').addClass('hidden')
  $('#pre_backupInfo').text('')
})

